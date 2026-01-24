import Link from "next/link"
import { HelperText } from "@/components/ui/helper-text"

export default function PhotosPage() {
	return (
		<main className="min-h-screen flex items-center justify-center p-8">
			<div className="w-full max-w-3xl text-center">
				<HelperText className="mb-8">Coming soon</HelperText>
				<Link href="/club" className="btn btn-primary">
					Back to Club Administration
				</Link>
			</div>
		</main>
	)
}
