import Link from "next/link"

export default function SettingsPage() {
	return (
		<main className="min-h-screen flex items-center justify-center p-8">
			<div className="w-full max-w-3xl text-center">
				<p className="text-muted-foreground mb-8">Coming soon</p>
				<Link href="/club" className="btn btn-primary">
					Back to Club Administration
				</Link>
			</div>
		</main>
	)
}
