"use client"

import { useCallback, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
	const [dark, setDark] = useState(false)

	useEffect(() => {
		setDark(document.documentElement.classList.contains("dark"))
	}, [])

	const toggle = useCallback(() => {
		const next = !dark
		setDark(next)
		document.documentElement.classList.toggle("dark", next)
		localStorage.setItem("theme", next ? "dark" : "light")
	}, [dark])

	return (
		<Button variant="ghost" size="icon" className="text-[hsl(var(--primary-foreground))] hover:bg-white/10" onClick={toggle} aria-label="Toggle theme">
			{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
		</Button>
	)
}
