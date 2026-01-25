"use client"

import { useCallback, useEffect, useReducer } from "react"
import type { ClubDocumentCode, Document, StaticDocument } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/app/components/ui/card"
import { CodeList } from "./components/code-list"
import { UploadForm, type UploadFormData } from "./components/upload-form"
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

	const handleCancel = () => {
		dispatch({ type: "RESET" })
	}

	const handleUploadSubmit = async (data: UploadFormData) => {
		if (!state.selectedCode) return

		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		const formData = new FormData()
		formData.append("title", data.title)
		formData.append("document_type", data.documentType)
		formData.append("year", String(data.year))
		if (data.file) {
			formData.append("file", data.file)
		}

		try {
			// Step 1: Create document
			const docRes = await fetch("/api/documents", {
				method: "POST",
				body: formData,
			})

			if (!docRes.ok) {
				const errorData = (await docRes.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to create document")
			}

			const createdDoc = (await docRes.json()) as Document

			// Step 2: Link document to code via static-documents
			const linkRes = await fetch("/api/static-documents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: state.selectedCode.code,
					document: createdDoc.id,
				}),
			})

			if (!linkRes.ok) {
				const errorData = (await linkRes.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to link document to code")
			}

			// Refetch static documents
			await fetchStaticDocuments()
			dispatch({ type: "RESET" })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to upload document",
			})
		} finally {
			dispatch({ type: "SET_SUBMITTING", payload: false })
		}
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

			{state.mode === "upload" && state.selectedCode && (
				<Card shadow="xs" className="mb-4">
					<CardBody>
						<CardTitle>Upload Document for {state.selectedCode.displayName}</CardTitle>
						<UploadForm
							code={state.selectedCode}
							onSubmit={handleUploadSubmit}
							onCancel={handleCancel}
							isSubmitting={state.isSubmitting}
						/>
					</CardBody>
				</Card>
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
