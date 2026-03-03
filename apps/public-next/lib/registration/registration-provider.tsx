"use client"

import {
	type PropsWithChildren,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react"
import { useRouter } from "next/navigation"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "../auth-context"
import { isPaymentsOpen, RegistrationType } from "../event-utils"
import { useRegistrationSSE } from "../hooks/use-registration-sse"
import type { ClubEventDetail, Course, EventFee } from "../types"
import { calculateFeeAmount, type FeePlayer } from "./fee-utils"
import {
	defaultRegistrationState,
	registrationReducer,
	type RegistrationStep,
} from "./registration-reducer"
import { RegistrationContext } from "./registration-context"
import { getWaveUnlockTimes, transformSSESlots } from "./reserve-utils"
import type {
	RegistrationMode,
	ServerPayment,
	ServerRegistration,
	ServerRegistrationFee,
	ServerRegistrationSlot,
	SSEUpdateEvent,
} from "./types"
import { getCorrelationId } from "./correlation"
import { BACK_NAVIGATION, useRegistrationGuard } from "./use-registration-guard"

interface RegistrationProviderProps {
	clubEvent: ClubEventDetail
}

async function apiFetch<T = unknown>(
	url: string,
	options?: RequestInit & { correlationId?: string },
): Promise<T> {
	const { correlationId, ...fetchOptions } = options ?? {}
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(correlationId ? { "X-Correlation-ID": correlationId } : {}),
	}
	const response = await fetch(url, { ...fetchOptions, headers })
	if (!response.ok) {
		const body = await response.text()
		let message: string
		try {
			const parsed = JSON.parse(body) as Record<string, unknown>
			message =
				(parsed.detail as string) ?? (parsed.message as string) ?? (parsed.error as string) ?? body
		} catch {
			message = body
		}
		throw new Error(message)
	}
	if (response.status === 204) return undefined as T
	return response.json() as Promise<T>
}

export function RegistrationProvider({
	clubEvent,
	children,
}: PropsWithChildren<RegistrationProviderProps>) {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [state, dispatch] = useReducer(registrationReducer, defaultRegistrationState)
	const { user } = useAuth()

	// --- Navigation guard ---
	const guardActive = state.mode === "new" && state.registration !== null
	const {
		pendingNavigation,
		requestNavigation,
		cancelNavigation,
		confirmNavigation,
		suppressBeforeUnload,
	} = useRegistrationGuard({ active: guardActive })

	// Load event into state on mount or event change
	useEffect(() => {
		const correlationId = getCorrelationId(clubEvent.id)
		dispatch({
			type: "load-event",
			payload: { clubEvent, correlationId },
		})
	}, [clubEvent])

	// --- SSE integration ---

	const [isSSEEnabled, setIsSSEEnabled] = useState(() => {
		if (!clubEvent) return false
		return isPaymentsOpen(clubEvent, new Date())
	})

	useEffect(() => {
		if (!clubEvent) return

		if (isPaymentsOpen(clubEvent, new Date())) {
			setIsSSEEnabled(true)
			return
		}

		// Registration hasn't started yet — schedule re-evaluation at the open time
		const startStr = clubEvent.priority_signup_start ?? clubEvent.signup_start
		if (!startStr) return

		const startTime = new Date(startStr)
		const msUntilOpen = startTime.getTime() - Date.now()
		if (msUntilOpen <= 0) {
			setIsSSEEnabled(true)
			return
		}

		const timer = setTimeout(() => setIsSSEEnabled(true), msUntilOpen)
		return () => clearTimeout(timer)
	}, [clubEvent])

	const handleSSEUpdate = useCallback(
		(data: SSEUpdateEvent) => {
			const transformed = transformSSESlots(data.slots)
			queryClient.setQueryData(["event-registration-slots", clubEvent.id], transformed)
			void queryClient.invalidateQueries({
				queryKey: ["event-registrations", clubEvent.id],
			})
			dispatch({ type: "update-sse-wave", payload: { wave: data.currentWave } })
		},
		[clubEvent.id, queryClient],
	)

	const { connected: sseConnected } = useRegistrationSSE({
		eventId: clubEvent.id,
		enabled: isSSEEnabled,
		onUpdate: handleSSEUpdate,
	})

	// Sync SSE connected state into reducer
	useEffect(() => {
		dispatch({ type: "update-sse-connected", payload: { connected: sseConnected } })
	}, [sseConnected])

	// --- Client-side wave computation (immediate, SSE overrides when available) ---
	const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (waveTimerRef.current) {
			clearTimeout(waveTimerRef.current)
			waveTimerRef.current = null
		}

		// Start wave timer whenever the event has wave config, regardless of SSE state.
		// This ensures sseCurrentWave is set to 0 before registration opens, enabling
		// the 15-second pulse animation and automatic transition when registration starts.
		if (!clubEvent.priority_signup_start || !clubEvent.signup_start) return

		const computeAndSchedule = () => {
			const unlockTimes = getWaveUnlockTimes(clubEvent)
			const now = Date.now()

			if (unlockTimes.length === 0) {
				// No waves configured — unlock everything
				dispatch({ type: "update-sse-wave", payload: { wave: 0 } })
				return
			}

			// Determine current wave: count how many unlock times have passed
			let currentWave = 0
			let nextUnlockMs: number | null = null
			for (const [i, unlockTime] of unlockTimes.entries()) {
				if (now >= unlockTime.getTime()) {
					currentWave = i + 1
				} else {
					nextUnlockMs = unlockTime.getTime() - now
					break
				}
			}

			dispatch({ type: "update-sse-wave", payload: { wave: currentWave } })

			// Schedule re-computation at the next wave boundary
			if (nextUnlockMs !== null) {
				waveTimerRef.current = setTimeout(computeAndSchedule, nextUnlockMs + 100)
			}
		}

		// Compute immediately — SSE updates will override via handleSSEUpdate
		computeAndSchedule()

		return () => {
			if (waveTimerRef.current) clearTimeout(waveTimerRef.current)
		}
	}, [clubEvent])

	// --- Mutations ---

	const { mutateAsync: createPaymentMutation } = useMutation({
		mutationFn: (payment: ServerPayment) => {
			return apiFetch<ServerPayment>("/api/payments", {
				method: "POST",
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					eventType: state.clubEvent?.event_type,
					userId: user?.id,
					paymentDetails: payment.details.map((f) => ({
						eventFeeId: f.eventFeeId,
						registrationSlotId: f.registrationSlotId,
						amount: f.amount,
					})),
					isUpdate: state.mode === "edit",
				}),
				correlationId: state.correlationId,
			})
		},
		onSuccess: (data) => {
			dispatch({ type: "update-payment", payload: { payment: data } })
		},
		onError: (error: Error) => {
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	const { mutateAsync: updatePaymentMutation } = useMutation({
		mutationFn: (payment: ServerPayment) => {
			return apiFetch<ServerPayment>(`/api/payments/${payment.id}`, {
				method: "PUT",
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					eventType: state.clubEvent?.event_type,
					userId: user?.id,
					paymentDetails: payment.details.map((f) => ({
						eventFeeId: f.eventFeeId,
						registrationSlotId: f.registrationSlotId,
						amount: f.amount,
					})),
				}),
				correlationId: state.correlationId,
			})
		},
		onSuccess: (data) => {
			dispatch({ type: "update-payment", payload: { payment: data } })
		},
		onError: (error: Error) => {
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	const { mutateAsync: createPaymentIntentMutation } = useMutation({
		mutationFn: () => {
			return apiFetch<{ client_secret: string }>(
				`/api/payments/${state.payment?.id}/payment-intent`,
				{
					method: "POST",
					body: JSON.stringify({
						eventId: state.clubEvent?.id,
						registrationId: state.registration?.id,
					}),
					correlationId: state.correlationId,
				},
			)
		},
		onError: (error: Error) => {
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	const { mutate: updateSlotPlayerMutation } = useMutation({
		mutationFn: ({ slotId, playerId }: { slotId: number; playerId: number | null }) => {
			return apiFetch(`/api/registration/slots/${slotId}`, {
				method: "PATCH",
				body: JSON.stringify({ playerId }),
				correlationId: state.correlationId,
			})
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["event-registration-slots", state.clubEvent?.id],
			})
		},
		onError: (error: Error) => {
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	const { mutateAsync: cancelRegistrationMutation } = useMutation({
		mutationFn: ({ reason }: { reason: string }) => {
			const registrationId = state.registration?.id ?? 0
			return apiFetch(`/api/registration/${registrationId}/cancel`, {
				method: "PUT",
				body: JSON.stringify({
					paymentId: state.payment?.id ?? null,
					reason,
				}),
				correlationId: state.correlationId,
			})
		},
		onSuccess: () => {
			dispatch({ type: "cancel-registration" })
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: ["registration"] })
			void queryClient.invalidateQueries({
				queryKey: ["event-registrations", state.clubEvent?.id],
			})
			void queryClient.invalidateQueries({
				queryKey: ["event-registration-slots", state.clubEvent?.id],
			})
		},
		onError: (error: Error) => {
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	const { mutateAsync: updateNotesMutation } = useMutation({
		mutationFn: (notes: string) => {
			return apiFetch(`/api/registration/${state.registration?.id}`, {
				method: "PATCH",
				body: JSON.stringify({ notes }),
				correlationId: state.correlationId,
			})
		},
		onSuccess: (_, notes) => {
			dispatch({ type: "update-registration-notes", payload: { notes } })
		},
		onError: (error: Error) => {
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	const selectedStartRef = useRef<string | undefined>(undefined)

	const { mutateAsync: createRegistrationMutation } = useMutation({
		mutationFn: ({
			course,
			slots,
			selectedStart,
		}: {
			course?: Course
			slots?: { id: number }[]
			selectedStart?: string
		}) => {
			selectedStartRef.current = selectedStart
			return apiFetch<ServerRegistration>("/api/registration", {
				method: "POST",
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					courseId: course?.id,
					slotIds: slots?.map((s) => s.id),
				}),
				correlationId: state.correlationId,
			})
		},
		onSuccess: (data) => {
			const payment = createInitialPaymentRecord(data)
			dispatch({
				type: "create-registration",
				payload: { registration: data, payment, selectedStart: selectedStartRef.current },
			})
			queryClient.setQueryData(["registration", state.clubEvent?.id], data)
		},
		onError: (error: Error) => {
			if (error.message.startsWith("One or more of the slots")) {
				void queryClient.invalidateQueries({
					queryKey: ["event-registration-slots", state.clubEvent?.id],
				})
			}
			dispatch({ type: "update-error", payload: { error: error.message } })
		},
	})

	// --- Helpers ---

	const createInitialPaymentRecord = (registration: ServerRegistration): ServerPayment => {
		if (!state.clubEvent || !user?.id) {
			throw new Error("Cannot create an initial payment record without a club event or user.")
		}
		if (!registration.slots?.length) {
			throw new Error("Cannot create an initial payment record without registration slots.")
		}
		const firstSlot = registration.slots[0]
		const details: ServerPayment["details"] = []

		// Build a FeePlayer from the current user for fee calculation
		const feePlayer: FeePlayer = {
			birthDate: user.birthDate ?? null,
			isMember: true, // user is registering, so they're a member
			lastSeason: null,
		}

		state.clubEvent.fees
			.filter((f) => f.is_required)
			.forEach((fee) => {
				details.push({
					id: 0,
					paymentId: 0,
					eventFeeId: fee.id,
					registrationSlotId: firstSlot.id,
					amount: calculateFeeAmount(fee, feePlayer),
					isPaid: false,
				})
			})

		return {
			id: 0,
			eventId: state.clubEvent.id,
			userId: user.id,
			paymentCode: "",
			paymentKey: null,
			paymentAmount: null,
			transactionFee: null,
			notificationType: null,
			confirmed: false,
			details,
		}
	}

	// --- Context methods ---

	const updateStep = useCallback((step: RegistrationStep) => {
		dispatch({ type: "update-step", payload: { step } })
	}, [])

	const createRegistration = useCallback(
		(course?: Course, slots?: { id: number }[], selectedStart?: string) => {
			return createRegistrationMutation({ course, slots, selectedStart }).then(() => {})
		},
		[createRegistrationMutation],
	)

	const loadRegistration = useCallback(
		async (playerId: number) => {
			try {
				const result = await apiFetch<{ registration: ServerRegistration }>(
					`/api/registration?event_id=${state.clubEvent?.id}&player_id=${playerId}`,
				)
				if (result) {
					const { registration } = result
					const fees: ServerRegistrationFee[] = registration.slots.flatMap((slot) => slot.fees)
					dispatch({
						type: "load-registration",
						payload: {
							registration,
							payment: {
								id: 0,
								eventId: state.clubEvent?.id ?? 0,
								userId: user?.id ?? 0,
								paymentCode: "",
								paymentKey: null,
								paymentAmount: null,
								transactionFee: null,
								notificationType: null,
								confirmed: false,
								details: [],
							},
							existingFees: fees,
						},
					})
					queryClient.setQueryData(["registration", state.clubEvent?.id], result.registration)
					void queryClient.invalidateQueries({
						queryKey: ["event-registrations", state.clubEvent?.id],
					})
					void queryClient.invalidateQueries({
						queryKey: ["event-registration-slots", state.clubEvent?.id],
					})
				}
			} catch (error) {
				dispatch({
					type: "update-error",
					payload: { error: (error as Error).message },
				})
			}
		},
		[state.clubEvent?.id, queryClient, user?.id],
	)

	const startEditRegistration = useCallback(
		(registration: ServerRegistration) => {
			const fees: ServerRegistrationFee[] = registration.slots.flatMap((slot) => slot.fees)
			dispatch({
				type: "load-registration",
				payload: {
					registration,
					payment: {
						id: 0,
						eventId: state.clubEvent?.id ?? 0,
						userId: user?.id ?? 0,
						paymentCode: "",
						paymentKey: null,
						paymentAmount: null,
						transactionFee: null,
						notificationType: null,
						confirmed: false,
						details: [],
					},
					existingFees: fees,
				},
			})
		},
		[state.clubEvent?.id, user?.id],
	)

	const editRegistration = useCallback(
		async (registrationId: number, playerIds: number[]) => {
			try {
				const registration = await apiFetch<ServerRegistration>(
					`/api/registration/${registrationId}/add-players`,
					{
						method: "PUT",
						body: JSON.stringify({
							players: playerIds.map((id) => ({ id })),
						}),
					},
				)
				if (registration) {
					const fees: ServerRegistrationFee[] = registration.slots.flatMap((slot) => slot.fees)
					const playerIdSet = new Set(playerIds)
					const requiredFeeDetails = registration.slots
						.filter((slot) => slot.player && playerIdSet.has(slot.player.id))
						.flatMap((slot) => {
							const player = slot.player!
							const feePlayer: FeePlayer = {
								birthDate: player.birthDate,
								isMember: Boolean(player.isMember),
								lastSeason: player.lastSeason,
							}
							return (state.clubEvent?.fees ?? [])
								.filter((f) => f.is_required)
								.map((fee) => ({
									id: 0,
									paymentId: 0,
									eventFeeId: fee.id,
									registrationSlotId: slot.id,
									amount: calculateFeeAmount(fee, feePlayer),
									isPaid: false,
								}))
						})
					dispatch({
						type: "load-registration",
						payload: {
							registration,
							payment: {
								id: 0,
								eventId: state.clubEvent?.id ?? 0,
								userId: user?.id ?? 0,
								paymentCode: "",
								paymentKey: null,
								paymentAmount: null,
								transactionFee: null,
								notificationType: null,
								confirmed: false,
								details: requiredFeeDetails,
							},
							existingFees: fees,
						},
					})
					queryClient.setQueryData(["registration", state.clubEvent?.id], registration)
					void queryClient.invalidateQueries({
						queryKey: ["event-registrations", state.clubEvent?.id],
					})
					void queryClient.invalidateQueries({
						queryKey: ["event-registration-slots", state.clubEvent?.id],
					})
				}
			} catch (error) {
				dispatch({
					type: "update-error",
					payload: { error: (error as Error).message },
				})
				throw error
			}
		},
		[state.clubEvent?.id, queryClient, user?.id],
	)

	const updateRegistrationNotes = useCallback(
		(notes: string) => {
			if (notes?.trim()?.length > 0) {
				return updateNotesMutation(notes).then(() => {})
			}
			return Promise.resolve()
		},
		[updateNotesMutation],
	)

	const cancelRegistration = useCallback(
		(reason: "user" | "timeout" | "navigation" | "violation", mode: RegistrationMode) => {
			if (mode === "new") {
				return cancelRegistrationMutation({ reason }).then(() => {})
			}
			void queryClient.invalidateQueries({ queryKey: ["registration"] })
			return Promise.resolve()
		},
		[cancelRegistrationMutation, queryClient],
	)

	const completeRegistration = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: ["my-player"] })
		void queryClient.invalidateQueries({
			queryKey: ["event-registrations", state.clubEvent?.id],
		})
		void queryClient.invalidateQueries({
			queryKey: ["event-registration-slots", state.clubEvent?.id],
		})
		if (state.clubEvent?.id) {
			void fetch("/api/revalidate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tag: `event-registrations-${state.clubEvent.id}` }),
			})
		}
		dispatch({ type: "complete-registration" })
	}, [queryClient, state.clubEvent?.id])

	const initiateStripeSession = useCallback(() => {
		apiFetch<{ clientSecret: string }>("/api/payments/customer-session", {
			method: "POST",
			body: JSON.stringify({}),
			correlationId: state.correlationId,
		})
			.then((data) => {
				dispatch({
					type: "initiate-stripe-session",
					payload: { clientSessionKey: data.clientSecret },
				})
			})
			.catch((error: Error) => {
				dispatch({ type: "update-error", payload: { error: error.message } })
			})
	}, [state.correlationId])

	const createPaymentIntent = useCallback(() => {
		return createPaymentIntentMutation()
	}, [createPaymentIntentMutation])

	const savePayment = useCallback(() => {
		if (!state.payment) {
			return Promise.reject(new Error("No payment to save"))
		}
		if (state.payment.id) {
			return updatePaymentMutation(state.payment).then(() => {})
		}
		return createPaymentMutation(state.payment).then(() => {})
	}, [createPaymentMutation, updatePaymentMutation, state.payment])

	const addPlayer = useCallback(
		(slot: ServerRegistrationSlot, playerId: number, playerName: string, player: FeePlayer) => {
			updateSlotPlayerMutation(
				{ slotId: slot.id, playerId },
				{
					onSuccess: () =>
						dispatch({
							type: "add-player",
							payload: { slot, playerId, playerName, player },
						}),
				},
			)
		},
		[updateSlotPlayerMutation],
	)

	const removePlayer = useCallback(
		(slot: ServerRegistrationSlot) => {
			updateSlotPlayerMutation(
				{ slotId: slot.id, playerId: null },
				{
					onSuccess: () => dispatch({ type: "remove-player", payload: { slotId: slot.id } }),
				},
			)
		},
		[updateSlotPlayerMutation],
	)

	const addFee = useCallback(
		(slot: ServerRegistrationSlot, eventFee: EventFee, player: FeePlayer) => {
			dispatch({ type: "add-fee", payload: { slotId: slot.id, eventFee, player } })
		},
		[],
	)

	const removeFee = useCallback((slot: ServerRegistrationSlot, eventFee: EventFee) => {
		dispatch({ type: "remove-fee", payload: { eventFeeId: eventFee.id, slotId: slot.id } })
	}, [])

	const canRegister = useCallback(() => {
		const slots = state.registration?.slots ?? []
		const filledCount = slots.filter((s) => s.player).length
		const now = new Date()

		// Check if priority registration is open
		if (
			state.clubEvent?.priority_signup_start &&
			state.clubEvent?.signup_start &&
			state.clubEvent.registration_type !== RegistrationType.None
		) {
			const priorityStart = new Date(state.clubEvent.priority_signup_start)
			const signupStart = new Date(state.clubEvent.signup_start)
			if (now >= priorityStart && now < signupStart) {
				// During priority: enforce minimum group size
				return filledCount >= (state.clubEvent.minimum_signup_group_size ?? 1)
			}
		}

		// Normal registration: at least 1 player
		if (
			state.clubEvent?.signup_start &&
			state.clubEvent?.signup_end &&
			state.clubEvent.registration_type !== RegistrationType.None
		) {
			const signupStart = new Date(state.clubEvent.signup_start)
			const signupEnd = new Date(state.clubEvent.signup_end)
			if (now >= signupStart && now <= signupEnd) {
				return filledCount >= 1
			}
		}

		return false
	}, [state.clubEvent, state.registration])

	const setError = useCallback((error: string | null) => {
		dispatch({ type: "update-error", payload: { error } })
	}, [])

	const handleGuardConfirm = useCallback(() => {
		const href = confirmNavigation()
		if (href) {
			if (href === BACK_NAVIGATION) {
				// For back button: go back in history, then cancel registration
				void cancelRegistration("navigation", state.mode)
				history.back()
			} else {
				// Navigate first, then cancel in background to avoid race with
				// the register page's useEffect that redirects when registration becomes null
				router.replace(href)
				void cancelRegistration("navigation", state.mode)
			}
		}
	}, [confirmNavigation, cancelRegistration, state.mode, router])

	const value = useMemo(
		() => ({
			...state,
			addFee,
			addPlayer,
			cancelRegistration,
			canRegister,
			completeRegistration,
			createPaymentIntent,
			createRegistration,
			editRegistration,
			initiateStripeSession,
			loadRegistration,
			startEditRegistration,
			removeFee,
			removePlayer,
			requestNavigation,
			savePayment,
			setError,
			suppressBeforeUnload,
			updateRegistrationNotes,
			updateStep,
		}),
		[
			state,
			addFee,
			addPlayer,
			cancelRegistration,
			canRegister,
			completeRegistration,
			createPaymentIntent,
			createRegistration,
			editRegistration,
			initiateStripeSession,
			loadRegistration,
			startEditRegistration,
			removeFee,
			removePlayer,
			requestNavigation,
			savePayment,
			setError,
			suppressBeforeUnload,
			updateRegistrationNotes,
			updateStep,
		],
	)

	return (
		<RegistrationContext.Provider value={value}>
			{children}
			<AlertDialog open={pendingNavigation !== null} onOpenChange={() => cancelNavigation()}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave Registration?</AlertDialogTitle>
						<AlertDialogDescription>
							You have an in-progress registration. Leaving this page will cancel your registration
							and release your reserved spots.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Stay</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleGuardConfirm}>
							Leave
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</RegistrationContext.Provider>
	)
}
