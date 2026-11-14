"use client"

import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/shadcn/button"

/**
 * Switches between the light ("corporate") and dark ("business") themes. The
 * icon follows the `dark:` variant, which is bound to data-theme, so the
 * component holds no state.
 */
export default function ThemeToggle() {
	const toggleTheme = () => {
		const root = document.documentElement
		const next = root.getAttribute("data-theme") === "business" ? "corporate" : "business"
		root.setAttribute("data-theme", next)
		try {
			localStorage.setItem("theme", next)
		} catch {
			// Storage can be unavailable (private mode); the theme still applies for this visit.
		}
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			aria-label="Toggle dark mode"
			className="text-header-foreground hover:bg-white/10 hover:text-header-foreground"
		>
			<Sun className="size-5 dark:hidden" />
			<Moon className="hidden size-5 dark:block" />
		</Button>
	)
}
