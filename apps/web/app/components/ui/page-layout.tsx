"use client"

interface PageLayoutProps {
	maxWidth?: "3xl" | "5xl" | "6xl"
	children: React.ReactNode
	className?: string
}

export function PageLayout({ maxWidth = "3xl", children, className }: PageLayoutProps) {
	return (
		<main className={`min-h-screen flex justify-center md:p-8 ${className || ""}`}>
			<div className={`w-full max-w-${maxWidth}`}>{children}</div>
		</main>
	)
}
