"use client"

import { useCallback, useEffect, useReducer } from "react"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/app/components/ui/card"
import { AnnouncementTable } from "./components/announcement-table"
import { AnnouncementForm } from "./components/announcement-form"
import { DeleteConfirmModal } from "./components/delete-confirm-modal"
import { initialState, reducer } from "./reducer"
import type { Announcement, AnnouncementFormData, AvailableDocument, ClubEvent } from "./types"

export default function AnnouncementsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const [state, dispatch] = useReducer(reducer, initialState)

	const currentSeason = new Date().getFullYear()

	const fetchAnnouncements = useCallback(async () => {
		try {
			const res = await fetch("/api/announcements")
			if (!res.ok) {
				throw new Error("Failed to load announcements")
			}
			const data = (await res.json()) as Announcement[]
			dispatch({ type: "SET_ANNOUNCEMENTS", payload: data })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to load announcements",
			})
		}
	}, [])

	const fetchEvents = useCallback(async (season: number) => {
		try {
			const res = await fetch(`/api/events?season=${season}`)
			if (!res.ok) {
				return
			}
			const data = (await res.json()) as ClubEvent[]
			dispatch({ type: "SET_EVENTS", payload: data })
		} catch {
			// Events are optional, don't block on failure
		}
	}, [])

	const fetchDocuments = useCallback(async () => {
		try {
			const res = await fetch("/api/available-documents")
			if (!res.ok) {
				return
			}
			const data = (await res.json()) as AvailableDocument[]
			dispatch({ type: "SET_DOCUMENTS", payload: data })
		} catch {
			// Documents are optional, don't block on failure
		}
	}, [])

	useEffect(() => {
		if (signedIn) {
			const loadData = async () => {
				dispatch({ type: "SET_LOADING", payload: true })
				await Promise.all([fetchAnnouncements(), fetchEvents(currentSeason), fetchDocuments()])
				dispatch({ type: "SET_LOADING", payload: false })
			}
			void loadData()
		}
	}, [signedIn, fetchAnnouncements, fetchEvents, fetchDocuments, currentSeason])

	const handleAdd = () => {
		dispatch({ type: "SET_MODE", payload: "create" })
	}

	const handleEdit = (announcement: Announcement) => {
		dispatch({ type: "SELECT_ANNOUNCEMENT", payload: announcement })
		dispatch({ type: "SET_MODE", payload: "edit" })
	}

	const handleDelete = (announcement: Announcement) => {
		dispatch({ type: "SELECT_ANNOUNCEMENT", payload: announcement })
		dispatch({ type: "SET_MODE", payload: "delete" })
	}

	const handleCancel = () => {
		dispatch({ type: "RESET" })
	}

	const handleCreateSubmit = async (data: AnnouncementFormData) => {
		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch("/api/announcements", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to create announcement")
			}

			await fetchAnnouncements()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to create announcement",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	const handleEditSubmit = async (data: AnnouncementFormData) => {
		if (!state.selectedAnnouncement) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch(`/api/announcements/${state.selectedAnnouncement.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to update announcement")
			}

			await fetchAnnouncements()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to update announcement",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	const handleDeleteConfirm = async () => {
		if (!state.selectedAnnouncement) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch(`/api/announcements/${state.selectedAnnouncement.id}`, {
				method: "DELETE",
			})

			if (!res.ok && res.status !== 204) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to delete announcement")
			}

			await fetchAnnouncements()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to delete announcement",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	if (state.isLoading) {
		return <LoadingSpinner size="lg" />
	}

	return (
		<PageLayout maxWidth="5xl">
			{state.error && (
				<Alert type="error" className="mb-4">
					{state.error}
				</Alert>
			)}

			{state.mode === "create" && (
				<Card shadow="xs" className="mb-4">
					<CardBody>
						<CardTitle>New Announcement</CardTitle>
						<AnnouncementForm
							events={state.events}
							documents={state.documents}
							onSubmit={handleCreateSubmit}
							onCancel={handleCancel}
							isSubmitting={state.isSubmitting}
						/>
					</CardBody>
				</Card>
			)}

			{state.mode === "edit" && state.selectedAnnouncement && (
				<Card shadow="xs" className="mb-4">
					<CardBody>
						<CardTitle>Edit Announcement</CardTitle>
						<AnnouncementForm
							announcement={state.selectedAnnouncement}
							events={state.events}
							documents={state.documents}
							onSubmit={handleEditSubmit}
							onCancel={handleCancel}
							isSubmitting={state.isSubmitting}
						/>
					</CardBody>
				</Card>
			)}

			{state.mode === "list" && (
				<AnnouncementTable
					announcements={state.announcements}
					onAdd={handleAdd}
					onEdit={handleEdit}
					onDelete={handleDelete}
				/>
			)}

			<DeleteConfirmModal
				isOpen={state.mode === "delete"}
				announcement={state.selectedAnnouncement}
				onConfirm={handleDeleteConfirm}
				onCancel={handleCancel}
				isDeleting={state.isSubmitting}
			/>
		</PageLayout>
	)
}
