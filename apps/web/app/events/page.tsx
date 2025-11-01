import Link from "next/link"

export default function EventsPage() {
	return (
		<main className="min-h-screen flex items-center justify-center p-8">
			<div className="w-full max-w-3xl text-center">
				<h1 className="text-3xl font-bold mb-4">Event Management</h1>
				<p className="text-muted-foreground mb-8">Coming soon</p>
				<Link href="/" className="btn btn-primary">
					Back to Home
				</Link>
			</div>
		</main>
	)
}
