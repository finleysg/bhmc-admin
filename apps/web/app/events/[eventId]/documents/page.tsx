"use client"

import { useCallback, useEffect, useReducer } from "react"
import { useParams } from "next/navigation"
import type { ClubEvent, Document } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { DocumentList } from "./components/document-list"
import { initialState, reducer } from "./reducer"

export default function DocumentsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string
	const [state, dispatch] = useReducer(reducer, initialState)

	const fetchEvent = useCallback(async () => {
		const res = await fetch(`/api/events/${eventId}`)
		if (res.ok) {
			const data = (await res.json()) as ClubEvent
			dispatch({ type: "SET_EVENT", payload: data })
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
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-3xl">
				<h2 className="text-3xl font-bold mb-4 text-center">Event Documents</h2>
				<div className="flex justify-end mb-4">
					<button type="button" className="btn btn-primary" onClick={handleAddClick}>
						Add Document
					</button>
				</div>
				<DocumentList documents={state.documents} onEdit={handleEdit} onDelete={handleDelete} />
			</div>
		</main>
	)
}
