"use client"

import {
	useEffect,
	useState,
} from "react"

export default function ThemeToggle() {
	const [isDark, setIsDark] = useState(false)

	useEffect(() => {
		// Check initial theme
		const theme = document.documentElement.getAttribute("data-theme")
		setIsDark(theme === "forest")
	}, [])

	const toggleTheme = () => {
		const newTheme = isDark ? "forest" : "lemonade"
		document.documentElement.setAttribute("data-theme", newTheme)
		setIsDark(!isDark)
		localStorage.setItem("theme", newTheme)
	}

	return (
		<label className="swap swap-rotate cursor-pointer">
			<input type="checkbox" checked={isDark} onChange={toggleTheme} className="sr-only" />

			{/* sun icon */}
			<svg
				className="swap-off h-6 w-6 fill-current"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
			>
				<path d="m6.76 4.84-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7 1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91 1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
			</svg>

			{/* moon icon */}
			<svg
				className="swap-on h-6 w-6 fill-current"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
			>
				<path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1-.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
			</svg>
		</label>
	)
}
