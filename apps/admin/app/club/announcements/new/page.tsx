"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/app/components/ui/card"
import { AnnouncementForm } from "../components/announcement-form"
import type { Announcement, AnnouncementFormData, AvailableDocument, ClubEvent } from "../types"

export default function NewAnnouncementPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()

	const [events, setEvents] = useState<ClubEvent[]>([])
	const [documents, setDocuments] = useState<AvailableDocument[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const currentSeason = new Date().getFullYear()

	const fetchEvents = useCallback(async (season: number) => {
		try {
			const res = await fetch(`/api/events?season=${season}`)
			if (!res.ok) return
			const data = (await res.json()) as ClubEvent[]
			setEvents(data)
		} catch {
			// Events are optional
		}
	}, [])

	const fetchDocuments = useCallback(async () => {
		try {
			const res = await fetch("/api/available-documents")
			if (!res.ok) return
			const data = (await res.json()) as AvailableDocument[]
			setDocuments(data)
		} catch {
			// Documents are optional
		}
	}, [])

	useEffect(() => {
		if (signedIn) {
			const loadData = async () => {
				await Promise.all([fetchEvents(currentSeason), fetchDocuments()])
				setIsLoading(false)
			}
			void loadData()
		}
	}, [signedIn, fetchEvents, fetchDocuments, currentSeason])

	const handleSubmit = async (data: AnnouncementFormData) => {
		setIsSubmitting(true)
		setError(null)

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

			const created = (await res.json()) as Announcement
			toast.success("Announcement created")
			router.push(`/club/announcements/${created.id}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create announcement")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCancel = () => {
		router.push("/club/announcements")
	}

	if (isPending || isLoading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	return (
		<PageLayout maxWidth="5xl">
			{error && (
				<Alert type="error" className="mb-4">
					{error}
				</Alert>
			)}
			<Card shadow="xs">
				<CardBody>
					<CardTitle>New Announcement</CardTitle>
					<AnnouncementForm
						events={events}
						documents={documents}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						isSubmitting={isSubmitting}
					/>
				</CardBody>
			</Card>
		</PageLayout>
	)
}
