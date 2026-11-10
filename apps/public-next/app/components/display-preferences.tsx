"use client"

import { useLayoutEffect, useRef } from "react"
import { useServerInsertedHTML } from "next/navigation"
import { parseTextSize, TEXT_SIZE_KEY, TEXT_SIZE_SCRIPT } from "@/lib/text-size"

const themeScript = `try {
  const theme = localStorage.getItem('theme');
  document.documentElement.classList.toggle('dark', theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
} catch (e) {}`

export function DisplayPreferences() {
	const inserted = useRef(false)
	// Insert into the server response only. React must not mount an executable
	// script during client recovery from an error or a development refresh.
	useServerInsertedHTML(() => {
		if (inserted.current) return null
		inserted.current = true
		return (
			<script
				id="display-preferences"
				dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT + themeScript }}
			/>
		)
	})

	useLayoutEffect(() => {
		// Also restore before paint when the layout is mounted entirely on the client.
		try {
			document.documentElement.dataset.textSize = parseTextSize(localStorage.getItem(TEXT_SIZE_KEY))
		} catch {
			/* Keep the current selection when storage is unavailable. */
		}
		try {
			const theme = localStorage.getItem("theme")
			document.documentElement.classList.toggle(
				"dark",
				theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches),
			)
		} catch {
			/* Keep the current theme when storage is unavailable. */
		}
	}, [])

	return null
}
