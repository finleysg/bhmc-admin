"use client"

import { useCallback, useEffect, useReducer } from "react"
import type { Tag } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/app/components/ui/card"
import { PhotoForm } from "./components/photo-form"
import { initialState, reducer } from "./reducer"

export default function PhotoUploadPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const [state, dispatch] = useReducer(reducer, initialState)

	const fetchTags = useCallback(async () => {
		try {
			const res = await fetch("/api/tags")
			if (!res.ok) {
				throw new Error("Failed to load tags")
			}
			const data = (await res.json()) as Tag[]
			dispatch({ type: "SET_TAGS", payload: data })
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to load tags",
			})
		} finally {
			dispatch({ type: "SET_LOADING", payload: false })
		}
	}, [])

	useEffect(() => {
		if (signedIn) {
			void fetchTags()
		}
	}, [signedIn, fetchTags])

	const handleSubmit = async (formData: FormData) => {
		dispatch({ type: "SET_SUBMITTING", payload: true })
		dispatch({ type: "SET_ERROR", payload: null })

		try {
			const res = await fetch("/api/photos", {
				method: "POST",
				body: formData,
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to upload photo")
			}

			dispatch({ type: "SET_SUCCESS", payload: true })

			// Reset form after brief delay
			setTimeout(() => {
				dispatch({ type: "RESET" })
			}, 100)
		} catch (err) {
			dispatch({
				type: "SET_ERROR",
				payload: err instanceof Error ? err.message : "Failed to upload photo",
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
		<PageLayout maxWidth="3xl">
			{state.error && (
				<Alert type="error" className="mb-4">
					{state.error}
				</Alert>
			)}

			{state.success && (
				<Alert type="success" className="mb-4">
					Photo uploaded successfully
				</Alert>
			)}

			<Card shadow="xs">
				<CardBody>
					<CardTitle>Upload Photo</CardTitle>
					<PhotoForm tags={state.tags} onSubmit={handleSubmit} isSubmitting={state.isSubmitting} />
				</CardBody>
			</Card>
		</PageLayout>
	)
}
