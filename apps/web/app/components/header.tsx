"use client"

import { usePathname } from "next/navigation"

import ThemeToggle from "./theme-toggle"

function getTitle(pathname: string): string {
	const segments = pathname.split("/").filter(Boolean)
	if (segments.length === 0) return "BHMC Administration"
	if (segments[0] === "club") return "Club Administration"
	if (segments[0] === "events") {
		if (segments.length === 1) return "Event Administration"
		if (segments.length >= 3) {
			const subpage = segments[2]
			if (subpage === "golf-genius") return "Golf Genius Integration"
			if (subpage === "reports") return "Event Reports"
			if (subpage === "players") return "Player Management"
			if (subpage === "payouts") return "Payout Status"
		}
		return "Event Administration"
	}
	return "BHMC Administration"
}

export default function Header() {
	const pathname = usePathname()
	const title = getTitle(pathname)

	return (
		<header className="navbar bg-base-300 container mx-auto pl-4 pr-4">
			<div className="flex-1">
				<h1 className="text-xl font-bold">{title}</h1>
			</div>
			<div className="flex-none">
				<ThemeToggle />
			</div>
			{/* <Breadcrumb /> */}
		</header>
	)
}
