"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { PaginatedResponse, PhotoData } from "@/lib/types"

async function fetchPhotos(page: number, tag?: string): Promise<PaginatedResponse<PhotoData>> {
	const params = new URLSearchParams({ page: String(page) })
	if (tag) params.set("tags", tag)
	const response = await fetch(`/api/photos?${params.toString()}`)
	if (!response.ok) throw new Error("Failed to fetch photos")
	return response.json() as Promise<PaginatedResponse<PhotoData>>
}

interface PhotoGridProps {
	tag?: string
}

export function PhotoGrid({ tag }: PhotoGridProps) {
	const [page, setPage] = useState(1)
	const [allPhotos, setAllPhotos] = useState<PhotoData[]>([])
	const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null)

	const { data, isLoading } = useQuery({
		queryKey: ["photos", tag, page],
		queryFn: () => fetchPhotos(page, tag),
	})

	if (data && data.results.length > 0) {
		const expectedLength = data.results.length * page
		if (expectedLength > allPhotos.length) {
			setAllPhotos((prev) => [...prev, ...data.results])
		}
	}

	const hasMore = data?.next !== null

	return (
		<>
			{allPhotos.length === 0 && !isLoading && (
				<p className="py-8 text-center text-muted-foreground">No photos found</p>
			)}

			<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{allPhotos.map((photo) => (
					<button
						key={photo.id}
						type="button"
						onClick={() => setSelectedPhoto(photo)}
						className="group overflow-hidden rounded-lg border transition-colors hover:border-primary"
					>
						{/* eslint-disable-next-line @next/no-img-element */}
						<img
							src={resolvePhotoUrl(photo.mobile_url)}
							alt={photo.caption ?? "Photo"}
							className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
						/>
						{photo.caption && (
							<p className="truncate p-2 text-xs text-muted-foreground">{photo.caption}</p>
						)}
					</button>
				))}
				{isLoading &&
					Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="aspect-square w-full rounded-lg" />
					))}
			</div>

			{hasMore && !isLoading && (
				<div className="mt-6 text-center">
					<Button variant="outline" onClick={() => setPage((p) => p + 1)}>
						Load more...
					</Button>
				</div>
			)}

			<Dialog
				open={selectedPhoto !== null}
				onOpenChange={(open) => !open && setSelectedPhoto(null)}
			>
				<DialogContent className="max-w-3xl">
					<DialogTitle className="sr-only">{selectedPhoto?.caption ?? "Photo"}</DialogTitle>
					<DialogDescription className="sr-only">
						Photo from {selectedPhoto?.year}
					</DialogDescription>
					{selectedPhoto && (
						<div>
							{/* eslint-disable-next-line @next/no-img-element */}
							<img
								src={resolvePhotoUrl(selectedPhoto.web_url)}
								alt={selectedPhoto.caption ?? "Photo"}
								className="w-full rounded-md"
							/>
							{selectedPhoto.caption && (
								<p className="mt-2 text-sm text-muted-foreground">{selectedPhoto.caption}</p>
							)}
							<p className="mt-1 text-xs text-muted-foreground">{selectedPhoto.year}</p>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}
