import { PropsWithChildren, useCallback, useEffect, useMemo, useReducer } from "react"

import { PaymentIntent } from "@stripe/stripe-js"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "../hooks/use-auth"
import { useRegistrationSSE } from "../hooks/use-registration-sse"
import { useMyPlayerRecord } from "../hooks/use-my-player-record"
import { EventType } from "../models/codes"
import { ClubEventProps } from "../models/common-props"
import { Course } from "../models/course"
import { EventFee } from "../models/event-fee"
import { Payment, PaymentDetail } from "../models/payment"
import { Player } from "../models/player"
import { Registration, RegistrationSlot, ServerRegistrationApiSchema } from "../models/registration"
import { SSEUpdateEvent, transformSlotsToApiFormat } from "../types/sse"
import { httpClient } from "../utils/api-client"
import { serverUrl } from "../utils/api-utils"
import { currentSeason } from "../utils/app-config"
import { getCorrelationId } from "../utils/correlation"
import {
	defaultRegistrationState,
	eventRegistrationReducer,
	IRegistrationStep,
	RegistrationMode,
} from "./registration-reducer"
import { EventRegistrationContext } from "./registration-context"

export function EventRegistrationProvider({
	clubEvent,
	children,
}: PropsWithChildren<ClubEventProps>) {
	const queryClient = useQueryClient()
	const [state, dispatch] = useReducer(eventRegistrationReducer, defaultRegistrationState)

	const { user } = useAuth()
	const { data: player } = useMyPlayerRecord()

	const isSSEEnabled = useMemo(() => {
		if (!clubEvent) return false
		return clubEvent.paymentsAreOpen(new Date())
	}, [clubEvent])

	const handleSSEUpdate = useCallback(
		(data: SSEUpdateEvent) => {
			const transformed = transformSlotsToApiFormat(data.slots)
			queryClient.setQueryData(["event-registration-slots", clubEvent?.id], transformed)
			queryClient.invalidateQueries({ queryKey: ["event-registrations", clubEvent?.id] })
			dispatch({ type: "update-sse-wave", payload: { wave: data.currentWave } })
		},
		[clubEvent?.id, queryClient],
	)

	useRegistrationSSE({
		eventId: clubEvent?.id,
		enabled: isSSEEnabled,
		onUpdate: handleSSEUpdate,
	})

	useEffect(() => {
		const correlationId = getCorrelationId(clubEvent?.id)
		dispatch({
			type: "load-event",
			payload: { clubEvent: clubEvent, correlationId: correlationId },
		})
	}, [clubEvent])

	const { mutateAsync: createPaymentMutation } = useMutation({
		mutationFn: (payment: Partial<Payment>) => {
			return httpClient(serverUrl("payments"), {
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					eventType: state.clubEvent?.eventType,
					userId: user.id,
					paymentDetails: payment.details?.map((f) => {
						return {
							eventFeeId: f.eventFeeId,
							registrationSlotId: f.slotId,
							amount: f.amount,
						}
					}),
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			})
		},
		onSuccess: (data) => {
			queryClient.setQueryData(["payment", state.clubEvent?.id], data)
			dispatch({ type: "update-payment", payload: { payment: Payment.fromServerData(data) } })
		},
		onError: (error) => {
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const { mutateAsync: updatePaymentMutation } = useMutation({
		mutationFn: (payment: Payment) => {
			return httpClient(serverUrl(`payments/${payment.id}`), {
				method: "PUT",
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					eventType: state.clubEvent?.eventType,
					userId: user.id,
					paymentDetails: payment.details?.map((f) => {
						return {
							eventFeeId: f.eventFeeId,
							registrationSlotId: f.slotId,
							amount: f.amount,
						}
					}),
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			})
		},
		onSuccess: (data) => {
			queryClient.setQueryData(["payment", state.clubEvent?.id], data)
			dispatch({ type: "update-payment", payload: { payment: Payment.fromServerData(data) } })
		},
		onError: (error) => {
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const { mutateAsync: createPaymentIntentMutation } = useMutation({
		mutationFn: () => {
			return httpClient(serverUrl(`payments/${state.payment?.id}/payment-intent/`), {
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					registrationId: state.registration?.id,
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			}) as Promise<PaymentIntent>
		},
		onError: (error) => {
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const { mutate: updateRegistrationSlotPlayerMutation } = useMutation({
		mutationFn: ({ slotId, playerId }: { slotId: number; playerId: number | null }) => {
			return httpClient(serverUrl(`registration/slots/${slotId}`), {
				method: "PATCH",
				body: JSON.stringify({
					playerId: playerId,
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["event-registration-slots", state.clubEvent?.id] })
		},
		onError: (error) => {
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const { mutateAsync: cancelRegistrationMutation } = useMutation({
		mutationFn: ({ reason }: { reason: "user" | "timeout" | "navigation" | "violation" }) => {
			const registrationId = state.registration?.id ?? 0
			const endpoint = `registration/${registrationId}/cancel/`
			return httpClient(serverUrl(endpoint), {
				method: "PUT",
				body: JSON.stringify({
					paymentId: state.payment?.id ?? null,
					reason: reason,
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			})
		},
		onSuccess: () => {
			dispatch({ type: "cancel-registration", payload: null })
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["registration"] })
			queryClient.invalidateQueries({ queryKey: ["event-registrations", state.clubEvent?.id] })
			queryClient.invalidateQueries({ queryKey: ["event-registration-slots", state.clubEvent?.id] })
		},
		onError: (error) => {
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const { mutateAsync: updateRegistrationNotesMutation } = useMutation({
		mutationFn: (notes: string) => {
			return httpClient(serverUrl(`registration/${state.registration?.id}`), {
				method: "PATCH",
				body: JSON.stringify({
					notes: notes,
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			})
		},
		onSuccess: (_, args) => {
			dispatch({ type: "update-registration-notes", payload: { notes: args } })
		},
		onError: (error) => {
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const { mutateAsync: createRegistrationMutation } = useMutation({
		mutationFn: ({
			course,
			slots,
		}: {
			course?: Course
			slots?: RegistrationSlot[]
			selectedStart?: string
		}) => {
			return httpClient(serverUrl("registration"), {
				body: JSON.stringify({
					eventId: state.clubEvent?.id,
					courseId: course?.id,
					slotIds: slots?.map((s) => s.id),
				}),
				headers: { "X-Correlation-ID": state.correlationId },
			})
		},
		onSuccess: (data, args) => {
			const registrationData = ServerRegistrationApiSchema.parse(data)
			const newRegistration = Registration.fromServerData(registrationData, args.selectedStart)
			dispatch({
				type: "create-registration",
				payload: {
					registration: newRegistration,
					payment: createInitialPaymentRecord(newRegistration),
				},
			})
			queryClient.setQueryData(["registration", state.clubEvent?.id], registrationData)
		},
		onError: (error) => {
			// conflict - the slots have been taken
			if (error.message.startsWith("One or more of the slots")) {
				queryClient.invalidateQueries({
					queryKey: ["event-registration-slots", state.clubEvent?.id],
				})
			}
			dispatch({ type: "update-error", payload: { error } })
		},
	})

	const createInitialPaymentRecord = (registration: Registration) => {
		if (!state.clubEvent || !user.id) {
			throw new Error("Cannot create an initial payment record without a club event or user.")
		}
		if (!registration.slots?.length) {
			throw new Error("Cannot create an initial payment record without registration slots.")
		}
		const payment = Payment.createPlaceholder(state.clubEvent.id, user.id)
		state.clubEvent.fees
			.filter((f) => f.isRequired)
			.forEach((fee) => {
				payment.details.push(
					new PaymentDetail({
						id: 0,
						payment: 0,
						event_fee: fee.id,
						registration_slot: registration.slots[0].id,
						amount: fee.amountDue(player),
					}),
				)
			})
		return payment
	}

	/**
	 * Updates query state so the UI reflects the completed registration.
	 */
	const invalidateQueries = useCallback(() => {
		if (state.clubEvent?.eventType === EventType.Membership) {
			queryClient.setQueryData(["player", user.email], {
				...player?.data,
				is_member: true,
				last_season: currentSeason - 1,
			})
		} else {
			queryClient.invalidateQueries({ queryKey: ["player", user.email] })
		}
		queryClient.invalidateQueries({ queryKey: ["my-cards"] })
		queryClient.invalidateQueries({ queryKey: ["my-events"] })
		queryClient.invalidateQueries({ queryKey: ["event-registrations", state.clubEvent?.id] })
		queryClient.invalidateQueries({ queryKey: ["event-registration-slots", state.clubEvent?.id] })
	}, [player?.data, queryClient, state.clubEvent?.eventType, state.clubEvent?.id, user.email])

	/**
	 * Changes the current step in the registration process.
	 */
	const updateStep = useCallback((step: IRegistrationStep) => {
		dispatch({ type: "update-step", payload: { step } })
	}, [])

	/**
	 * Creates a new registration record for the current user, attempting to
	 * reserve the specified slots.
	 */
	const createRegistration = useCallback(
		(course?: Course, slots?: RegistrationSlot[], selectedStart?: string) => {
			return createRegistrationMutation({ course, slots, selectedStart })
		},
		[createRegistrationMutation],
	)

	/**
	 * Loads an existing registration for a given player, if it exists.
	 */
	const loadRegistration = useCallback(
		async (player: Player) => {
			try {
				const result = await httpClient(
					serverUrl(`registration/?event_id=${state.clubEvent?.id}&player_id=${player.id}`),
				)
				if (result) {
					const registration = Registration.fromServerData(result.registration)
					const fees = registration.slots.flatMap((slot) => slot.fees)
					dispatch({
						type: "load-registration",
						payload: {
							registration,
							payment: Payment.createPlaceholder(state.clubEvent?.id ?? 0, user.id ?? 0),
							existingFees: fees,
						},
					})
					queryClient.setQueryData(["registration", state.clubEvent?.id], result.registration)
					queryClient.invalidateQueries({ queryKey: ["event-registrations", state.clubEvent?.id] })
					queryClient.invalidateQueries({
						queryKey: ["event-registration-slots", state.clubEvent?.id],
					})
				}
			} catch (error) {
				dispatch({ type: "update-error", payload: { error: error as Error } })
			}
		},
		[state.clubEvent?.id, queryClient, user.id],
	)

	/**
	 * Adds one or more players to an existing registration.
	 * TODO: this needs a better name
	 */
	const editRegistration = useCallback(
		async (registrationId: number, playerIds: number[]) => {
			try {
				const result = await httpClient(serverUrl(`registration/${registrationId}/add-players`), {
					method: "PUT",
					body: JSON.stringify({
						players: playerIds.map((id) => ({ id })),
					}),
				})
				if (result) {
					const registration = Registration.fromServerData(result.registration)
					const fees = registration.slots.flatMap((slot) => slot.fees)
					dispatch({
						type: "load-registration",
						payload: {
							registration,
							payment: Payment.createPlaceholder(state.clubEvent?.id ?? 0, user.id ?? 0),
							existingFees: fees,
						},
					})
					queryClient.setQueryData(["registration", state.clubEvent?.id], result.registration)
					queryClient.invalidateQueries({ queryKey: ["event-registrations", state.clubEvent?.id] })
					queryClient.invalidateQueries({
						queryKey: ["event-registration-slots", state.clubEvent?.id],
					})
				}
			} catch (error) {
				dispatch({ type: "update-error", payload: { error: error as Error } })
			}
		},
		[state.clubEvent?.id, queryClient, user.id],
	)

	/**
	 * Updates the current registration record with notes.
	 */
	const updateRegistrationNotes = useCallback(
		(notes: string) => {
			if (notes?.trim()?.length > 0) {
				return updateRegistrationNotesMutation(notes)
			} else {
				return Promise.resolve()
			}
		},
		[updateRegistrationNotesMutation],
	)

	/**
	 * Cancels the current registration and resets the registration process flow.
	 */
	const cancelRegistration = useCallback(
		(reason: "user" | "timeout" | "navigation" | "violation", mode: RegistrationMode) => {
			if (mode === "new") {
				return cancelRegistrationMutation({ reason })
			} else {
				queryClient.invalidateQueries({ queryKey: ["registration"] })
				return Promise.resolve()
			}
		},
		[cancelRegistrationMutation, queryClient],
	)

	/**
	 * Completes the registration process, clearing registration state and
	 * setting the mode to "idle", which enables the guard on the register routes.
	 */
	const completeRegistration = useCallback(() => {
		invalidateQueries()
		dispatch({ type: "complete-registration", payload: null })
	}, [invalidateQueries])

	/**
	 * Create and return a stripe customer session, which allows the user to
	 * save their payment information for future use.
	 */
	const initiateStripeSession = useCallback(() => {
		httpClient(serverUrl("payments/customer-session"), {
			method: "POST",
			body: JSON.stringify({}),
			headers: { "X-Correlation-ID": state.correlationId },
		})
			.then((data) => {
				dispatch({
					type: "initiate-stripe-session",
					payload: { clientSessionKey: data.clientSecret },
				})
			})
			.catch((error) => {
				dispatch({ type: "update-error", payload: { error } })
			})
	}, [state.correlationId])

	/**
	 * Create a payment intent for client-side processing.
	 */
	const createPaymentIntent = useCallback(() => {
		return createPaymentIntentMutation()
	}, [createPaymentIntentMutation])

	/**
	 * Saves the current payment record.
	 */
	const savePayment = useCallback(() => {
		if (!state.payment) {
			return Promise.reject(new Error("No payment to save"))
		}
		if (state.payment.id) {
			return updatePaymentMutation(state.payment)
		} else {
			const payment = { ...state.payment }
			return createPaymentMutation(payment)
		}
	}, [createPaymentMutation, updatePaymentMutation, state.payment])

	/**
	 * Add a player to a given registration slot.
	 */
	const addPlayer = useCallback(
		(slot: RegistrationSlot, player: Player) => {
			updateRegistrationSlotPlayerMutation(
				{ slotId: slot.id, playerId: player.id },
				{
					onSuccess: () => dispatch({ type: "add-player", payload: { slot, player } }),
				},
			)
		},
		[updateRegistrationSlotPlayerMutation],
	)

	/**
	 * Removes the player on a given registration slot.
	 */
	const removePlayer = useCallback(
		(slot: RegistrationSlot) => {
			updateRegistrationSlotPlayerMutation(
				{ slotId: slot.id, playerId: null },
				{
					onSuccess: () => dispatch({ type: "remove-player", payload: { slotId: slot.id } }),
				},
			)
		},
		[updateRegistrationSlotPlayerMutation],
	)

	/**
	 * Adds an event fee to a given registration slot.
	 */
	const addFee = useCallback((slot: RegistrationSlot, eventFee: EventFee, player: Player) => {
		dispatch({ type: "add-fee", payload: { slotId: slot.id, eventFee, player } })
	}, [])

	/**
	 * Removes an event fee from a given registration slot.
	 */
	const removeFee = useCallback((slot: RegistrationSlot, eventFee: EventFee) => {
		dispatch({ type: "remove-fee", payload: { eventFeeId: eventFee.id, slotId: slot.id } })
	}, [])

	const canRegister = useCallback(() => {
		const slots = state.registration?.slots ?? []
		if (state.clubEvent?.priorityRegistrationIsOpen()) {
			// During priority registration, the minimum signup group size is enforced.
			return (
				slots.filter((s) => s.playerId).length >= (state.clubEvent?.minimumSignupGroupSize ?? 1)
			)
		} else if (state.clubEvent?.registrationIsOpen()) {
			return slots.filter((s) => s.playerId).length >= 1
		}
		return false
	}, [state.clubEvent, state.registration])

	const setError = useCallback((error: Error | null) => {
		dispatch({ type: "update-error", payload: { error } })
	}, [])

	const value = {
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
		removeFee,
		removePlayer,
		savePayment,
		setError,
		updateRegistrationNotes,
		updateStep,
	}

	return (
		<EventRegistrationContext.Provider value={value}>{children}</EventRegistrationContext.Provider>
	)
}
