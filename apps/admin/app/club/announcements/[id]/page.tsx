"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/app/components/ui/card"
import { AnnouncementForm } from "../components/announcement-form"
import type { Announcement, AnnouncementFormData, AvailableDocument, ClubEvent } from "../types"

export default function EditAnnouncementPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()
	const params = useParams()
	const id = params.id as string

	const [announcement, setAnnouncement] = useState<Announcement | null>(null)
	const [events, setEvents] = useState<ClubEvent[]>([])
	const [documents, setDocuments] = useState<AvailableDocument[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [saveCount, setSaveCount] = useState(0)

	const currentSeason = new Date().getFullYear()

	const fetchAnnouncement = useCallback(async () => {
		const res = await fetch(`/api/announcements/${id}`)
		if (!res.ok) {
			throw new Error("Announcement not found")
		}
		const data = (await res.json()) as Announcement
		setAnnouncement(data)
	}, [id])

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
		if (signedIn && id) {
			const loadData = async () => {
				try {
					await Promise.all([fetchAnnouncement(), fetchEvents(currentSeason), fetchDocuments()])
				} catch (err) {
					setError(err instanceof Error ? err.message : "Failed to load announcement")
				} finally {
					setIsLoading(false)
				}
			}
			void loadData()
		}
	}, [signedIn, id, fetchAnnouncement, fetchEvents, fetchDocuments, currentSeason])

	const handleSubmit = async (data: AnnouncementFormData) => {
		setIsSubmitting(true)
		setError(null)

		try {
			const res = await fetch(`/api/announcements/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { error?: string }
				throw new Error(errorData.error ?? "Failed to update announcement")
			}

			const updated = (await res.json()) as Announcement
			setAnnouncement(updated)
			setSaveCount((c) => c + 1)
			toast.success("Announcement saved")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update announcement")
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

	if (!announcement) {
		return (
			<PageLayout maxWidth="5xl">
				<div className="text-center py-8">
					<p className="text-base-content/70 mb-4">{error ?? "Announcement not found"}</p>
					<button onClick={() => router.push("/club/announcements")} className="btn btn-primary">
						Back to Announcements
					</button>
				</div>
			</PageLayout>
		)
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
					<CardTitle>Edit Announcement</CardTitle>
					<AnnouncementForm
						key={saveCount}
						announcement={announcement}
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
