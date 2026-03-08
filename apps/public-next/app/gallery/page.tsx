import { PhotoGrid } from "./components/photo-grid"

interface GalleryPageProps {
	searchParams: Promise<{ tag?: string }>
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
	const { tag } = await searchParams

	return (
		<div>
			<h1 className="mb-4 text-2xl font-semibold text-primary">
				{tag ? `${tag} Photo Gallery` : "Photo Gallery"}
			</h1>
			<PhotoGrid tag={tag} />
		</div>
	)
}
