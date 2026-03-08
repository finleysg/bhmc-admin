"use client"

import type { ReactNode } from "react"

const MAX_WIDTH_MAP = { "3xl": "max-w-3xl", "5xl": "max-w-5xl", "6xl": "max-w-6xl" } as const

interface PageLayoutProps {
	maxWidth?: "3xl" | "5xl" | "6xl"
	children: ReactNode
	className?: string
}

export function PageLayout({ maxWidth = "3xl", children, className }: PageLayoutProps) {
	return (
		<main className={`min-h-screen flex justify-center md:p-8 ${className || ""}`}>
			<div className={`w-full ${MAX_WIDTH_MAP[maxWidth]}`}>{children}</div>
		</main>
	)
}
