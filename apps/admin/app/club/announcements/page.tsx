"use client"

import { useCallback, useEffect, useReducer } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { AnnouncementTable } from "./components/announcement-table"
import { DeleteConfirmModal } from "./components/delete-confirm-modal"
import { initialState, reducer } from "./reducer"
import type { Announcement } from "./types"

export default function AnnouncementsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const [state, dispatch] = useReducer(reducer, initialState)
	const router = useRouter()

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

	useEffect(() => {
		if (signedIn) {
			const loadData = async () => {
				dispatch({ type: "SET_LOADING", payload: true })
				await fetchAnnouncements()
				dispatch({ type: "SET_LOADING", payload: false })
			}
			void loadData()
		}
	}, [signedIn, fetchAnnouncements])

	const handleAdd = () => {
		router.push("/club/announcements/new")
	}

	const handleEdit = (announcement: Announcement) => {
		router.push(`/club/announcements/${announcement.id}`)
	}

	const handleDelete = (announcement: Announcement) => {
		dispatch({ type: "SELECT_ANNOUNCEMENT", payload: announcement })
		dispatch({ type: "SET_MODE", payload: "delete" })
	}

	const handleCancel = () => {
		dispatch({ type: "RESET" })
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

			<AnnouncementTable
				announcements={state.announcements}
				onAdd={handleAdd}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

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
