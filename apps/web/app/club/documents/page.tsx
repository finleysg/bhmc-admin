"use client"

import { useCallback, useEffect, useReducer } from "react"
import type { ClubDocumentCode, StaticDocument } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { CodeList } from "./components/code-list"
import { initialState, reducer } from "./reducer"

export default function ClubDocumentsPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const [state, dispatch] = useReducer(reducer, initialState)

	const fetchCodes = useCallback(async () => {
		try {
			const res = await fetch("/api/club-document-codes")
			if (!res.ok) {
				throw new Error("Failed to load document codes")
			}
			const data = (await res.json()) as ClubDocumentCode[]
			dispatch({ type: "SET_CODES", payload: data })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to load document codes",
			})
		}
	}, [])

	const fetchStaticDocuments = useCallback(async () => {
		try {
			const res = await fetch("/api/static-documents")
			if (!res.ok) {
				throw new Error("Failed to load static documents")
			}
			const data = (await res.json()) as StaticDocument[]
			dispatch({ type: "SET_STATIC_DOCUMENTS", payload: data })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to load static documents",
			})
		}
	}, [])

	useEffect(() => {
		if (signedIn) {
			const loadData = async () => {
				dispatch({ type: "SET_LOADING", payload: true })
				await Promise.all([fetchCodes(), fetchStaticDocuments()])
				dispatch({ type: "SET_LOADING", payload: false })
			}
			void loadData()
		}
	}, [signedIn, fetchCodes, fetchStaticDocuments])

	const handleUpload = (code: ClubDocumentCode) => {
		dispatch({ type: "SELECT_CODE", payload: code })
		dispatch({ type: "SET_MODE", payload: "upload" })
	}

	const handleReplace = (code: ClubDocumentCode, staticDoc: StaticDocument) => {
		dispatch({ type: "SELECT_CODE", payload: code })
		dispatch({ type: "SELECT_DOCUMENT", payload: staticDoc })
		dispatch({ type: "SET_MODE", payload: "replace" })
	}

	const handleRemove = (code: ClubDocumentCode, staticDoc: StaticDocument) => {
		dispatch({ type: "SELECT_CODE", payload: code })
		dispatch({ type: "SELECT_DOCUMENT", payload: staticDoc })
		dispatch({ type: "SET_MODE", payload: "delete" })
	}

	if (isPending || state.isLoading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	return (
		<PageLayout maxWidth="5xl">
			{state.error && (
				<Alert type="error" className="mb-4">
					{state.error}
				</Alert>
			)}

			{state.mode === "list" && (
				<CodeList
					codes={state.codes}
					staticDocuments={state.staticDocuments}
					onUpload={handleUpload}
					onReplace={handleReplace}
					onRemove={handleRemove}
				/>
			)}
		</PageLayout>
	)
}
