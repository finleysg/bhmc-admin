"use client"

import { useCallback, useEffect, useReducer } from "react"
import { useParams } from "next/navigation"
import type { ClubEvent, EventSessionWithFees } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert } from "@/components/ui/alert"
import { PageLayout } from "@/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { DeleteConfirmModal } from "./components/delete-confirm-modal"
import { SessionForm, type SessionFormData } from "./components/session-form"
import { SessionList } from "./components/session-list"
import { initialState, reducer } from "./reducer"

export default function SessionsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string
	const [state, dispatch] = useReducer(reducer, initialState)

	const fetchEvent = useCallback(async () => {
		try {
			const res = await fetch(`/api/events/${eventId}`)
			if (!res.ok) {
				throw new Error("Failed to load event")
			}
			const data = (await res.json()) as ClubEvent
			dispatch({ type: "SET_EVENT", payload: data })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to load event",
			})
		} finally {
			dispatch({ type: "SET_LOADING", payload: false })
		}
	}, [eventId])

	const fetchSessions = useCallback(async () => {
		const res = await fetch(`/api/events/${eventId}/sessions`)
		if (res.ok) {
			const data = (await res.json()) as EventSessionWithFees[]
			dispatch({ type: "SET_SESSIONS", payload: data })
		}
	}, [eventId])

	useEffect(() => {
		if (signedIn && eventId) {
			void fetchEvent()
			void fetchSessions()
		}
	}, [signedIn, eventId, fetchEvent, fetchSessions])

	const handleEdit = (session: EventSessionWithFees) => {
		dispatch({ type: "SELECT_SESSION", payload: session })
		dispatch({ type: "SET_MODE", payload: "edit" })
	}

	const handleDelete = (session: EventSessionWithFees) => {
		dispatch({ type: "SELECT_SESSION", payload: session })
		dispatch({ type: "SET_MODE", payload: "delete" })
	}

	const handleAddClick = () => {
		dispatch({ type: "SET_MODE", payload: "add" })
	}

	const handleCancel = () => {
		dispatch({ type: "RESET" })
	}

	const handleAddSubmit = async (data: SessionFormData) => {
		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch(`/api/events/${eventId}/sessions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { message?: string }
				throw new Error(errorData.message ?? "Failed to create session")
			}

			await fetchSessions()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to create session",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	const handleEditSubmit = async (data: SessionFormData) => {
		if (!state.selectedSession) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch(`/api/events/${eventId}/sessions/${state.selectedSession.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { message?: string }
				throw new Error(errorData.message ?? "Failed to update session")
			}

			await fetchSessions()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to update session",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	const handleDeleteConfirm = async () => {
		if (!state.selectedSession) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch(`/api/events/${eventId}/sessions/${state.selectedSession.id}`, {
				method: "DELETE",
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { message?: string }
				throw new Error(errorData.message ?? "Failed to delete session")
			}

			await fetchSessions()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to delete session",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	if (isPending || state.isLoading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null // Middleware will redirect
	}

	const eventFees = state.clubEvent?.eventFees ?? []

	return (
		<PageLayout maxWidth="3xl">
			<div className="flex items-center justify-between mb-6">
				{state.mode === "list" && (
					<button type="button" className="btn btn-primary" onClick={handleAddClick}>
						Add Session
					</button>
				)}
			</div>

			{state.error && (
				<Alert type="error" className=" mb-4">
					{state.error}
				</Alert>
			)}

			{state.mode === "add" && (
				<Card shadow="xs" className="mb-4">
					<CardBody>
						<CardTitle>Add Session</CardTitle>
						<SessionForm
							onSubmit={handleAddSubmit}
							onCancel={handleCancel}
							eventFees={eventFees}
							isSubmitting={state.isSubmitting}
						/>
					</CardBody>
				</Card>
			)}

			{state.mode === "edit" && state.selectedSession && (
				<Card shadow="xs" className="mb-4">
					<CardBody>
						<CardTitle>Edit Session</CardTitle>
						<SessionForm
							onSubmit={handleEditSubmit}
							onCancel={handleCancel}
							initialData={state.selectedSession}
							eventFees={eventFees}
							isSubmitting={state.isSubmitting}
						/>
					</CardBody>
				</Card>
			)}

			<DeleteConfirmModal
				isOpen={state.mode === "delete"}
				session={state.selectedSession}
				onConfirm={handleDeleteConfirm}
				onCancel={handleCancel}
				isDeleting={state.isSubmitting}
			/>

			{state.mode === "list" && (
				<SessionList
					sessions={state.sessions}
					eventFees={eventFees}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}
		</PageLayout>
	)
}
