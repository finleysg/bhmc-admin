"use client"

import { useCallback, useEffect, useReducer } from "react"
import { useParams } from "next/navigation"
import type { ClubEvent, Document } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { DeleteConfirmModal } from "./components/delete-confirm-modal"
import { DocumentForm, type DocumentFormData } from "./components/document-form"
import { DocumentList } from "./components/document-list"
import { initialState, reducer } from "./reducer"

export default function DocumentsPage() {
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

	const fetchDocuments = useCallback(async () => {
		const res = await fetch(`/api/documents?event_id=${eventId}`)
		if (res.ok) {
			const data = (await res.json()) as Document[]
			dispatch({ type: "SET_DOCUMENTS", payload: data })
		}
	}, [eventId])

	useEffect(() => {
		if (signedIn && eventId) {
			void fetchEvent()
			void fetchDocuments()
		}
	}, [signedIn, eventId, fetchEvent, fetchDocuments])

	const handleEdit = (document: Document) => {
		dispatch({ type: "SELECT_DOCUMENT", payload: document })
		dispatch({ type: "SET_MODE", payload: "edit" })
	}

	const handleDelete = (document: Document) => {
		dispatch({ type: "SELECT_DOCUMENT", payload: document })
		dispatch({ type: "SET_MODE", payload: "delete" })
	}

	const handleAddClick = () => {
		dispatch({ type: "SET_MODE", payload: "add" })
	}

	const handleCancel = () => {
		dispatch({ type: "RESET" })
	}

	const handleAddSubmit = async (data: DocumentFormData) => {
		if (!state.clubEvent) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		const year = new Date(state.clubEvent.startDate).getFullYear()

		const formData = new FormData()
		formData.append("title", data.title)
		formData.append("document_type", data.documentType)
		formData.append("year", String(year))
		formData.append("event", eventId)
		if (data.file) {
			formData.append("file", data.file)
		}

		try {
			const res = await fetch("/api/documents", {
				method: "POST",
				body: formData,
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to create document")
			}

			await res.json()
			// Refetch documents list
			const docsRes = await fetch(`/api/documents?event_id=${eventId}`)
			if (docsRes.ok) {
				const docs = (await docsRes.json()) as Document[]
				dispatch({ type: "SET_DOCUMENTS", payload: docs })
			}
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to create document",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	const handleEditSubmit = async (data: DocumentFormData) => {
		if (!state.selectedDocument) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		const formData = new FormData()
		formData.append("title", data.title)
		formData.append("document_type", data.documentType)
		if (data.file) {
			formData.append("file", data.file)
		}

		try {
			const res = await fetch(`/api/documents/${state.selectedDocument.id}`, {
				method: "PUT",
				body: formData,
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to update document")
			}

			await res.json()
			// Refetch documents list
			const docsRes = await fetch(`/api/documents?event_id=${eventId}`)
			if (docsRes.ok) {
				const docs = (await docsRes.json()) as Document[]
				dispatch({ type: "SET_DOCUMENTS", payload: docs })
			}
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to update document",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	const handleDeleteConfirm = async () => {
		if (!state.selectedDocument) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch(`/api/documents/${state.selectedDocument.id}`, {
				method: "DELETE",
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to delete document")
			}

			// Refetch documents list
			const docsRes = await fetch(`/api/documents?event_id=${eventId}`)
			if (docsRes.ok) {
				const docs = (await docsRes.json()) as Document[]
				dispatch({ type: "SET_DOCUMENTS", payload: docs })
			}
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to delete document",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
	}

	if (isPending || state.isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn) {
		return null
	}

	return (
		<main className="min-h-screen flex justify-center md:p-8">
			<div className="w-full max-w-3xl">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-3xl font-bold">Event Documents</h2>
					{state.mode === "list" && (
						<button type="button" className="btn btn-primary" onClick={handleAddClick}>
							Add Document
						</button>
					)}
				</div>

				{state.error && (
					<div className="alert alert-error mb-4">
						<span>{state.error}</span>
					</div>
				)}

				{state.mode === "add" && (
					<div className="card bg-base-100 shadow-xs mb-4">
						<div className="card-body">
							<h3 className="card-title text-secondary font-semibold mb-4">Add Document</h3>
							<DocumentForm
								onSubmit={handleAddSubmit}
								onCancel={handleCancel}
								isSubmitting={state.isSubmitting}
							/>
						</div>
					</div>
				)}

				{state.mode === "edit" && state.selectedDocument && (
					<div className="card bg-base-100 shadow-xs mb-4">
						<div className="card-body">
							<h3 className="card-title text-secondary font-semibold mb-4">Edit Document</h3>
							<DocumentForm
								onSubmit={handleEditSubmit}
								onCancel={handleCancel}
								initialData={state.selectedDocument}
								isSubmitting={state.isSubmitting}
							/>
						</div>
					</div>
				)}

				<DeleteConfirmModal
					isOpen={state.mode === "delete"}
					document={state.selectedDocument}
					onConfirm={handleDeleteConfirm}
					onCancel={handleCancel}
					isDeleting={state.isSubmitting}
				/>

				{state.mode === "list" && (
					<DocumentList documents={state.documents} onEdit={handleEdit} onDelete={handleDelete} />
				)}
			</div>
		</main>
	)
}
