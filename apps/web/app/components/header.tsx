"use client"

import { usePathname } from "next/navigation"

import ThemeToggle from "./theme-toggle"

export default function Header() {
	const pathname = usePathname()
	const isGolfGeniusPage = pathname === "/golf-genius"

	return (
		<header className="navbar bg-base-200 container mx-auto pl-4 pr-4">
			<div className="flex-1">
				<h1 className="text-xl font-bold">
					{isGolfGeniusPage ? "Golf Genius Integration" : "BHMC Event Admin"}
				</h1>
			</div>
			<div className="flex-none">
				<ThemeToggle />
			</div>
		</header>
	)
}
