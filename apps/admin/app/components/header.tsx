"use client"

import { usePathname } from "next/navigation"

import ThemeToggle from "./theme-toggle"

function getTitle(pathname: string): string {
	const segments = pathname.split("/").filter(Boolean)
	if (segments.length === 0) return "BHMC Administration"
	if (segments[0] === "club") {
		if (segments.length >= 2 && segments[1] === "players") return "Player Management"
		return "Club Administration"
	}
	if (segments[0] === "events") {
		if (segments.length === 1) return "Event Administration"
		if (segments.length >= 3) {
			const subpage = segments[2]
			if (subpage === "golf-genius") return "Golf Genius Integration"
			if (subpage === "reports") {
				if (segments.length >= 4 && segments[3] === "payments") return "Payment Report"
				return "Event Reports"
			}
			if (subpage === "players") return "Player Management"
			if (subpage === "payouts") return "Payout Status"
			if (subpage === "copy") return "Copy Event"
		}
		return "Event Administration"
	}
	return "BHMC Administration"
}

export default function Header() {
	const pathname = usePathname()
	const title = getTitle(pathname)

	return (
		<header className="sticky top-0 z-40 border-b bg-header text-header-foreground">
			<div className="container mx-auto flex min-h-14 items-center gap-4 px-4">
				<h1 className="flex-1 font-heading text-xl font-bold">{title}</h1>
				<ThemeToggle />
			</div>
		</header>
	)
}
