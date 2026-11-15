"use client"

import { useEffect, useRef } from "react"

/** Scrolls its container so the row marked `data-upcoming` is at the top. */
export function ScrollToUpcoming({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = ref.current
		const row = container?.querySelector<HTMLElement>("[data-upcoming]")
		if (!container || !row) return
		// Bounding rects share the viewport's coordinates; offsetTop values do not (the
		// shadcn Table wraps the table in its own positioned element).
		container.scrollTop += row.getBoundingClientRect().top - container.getBoundingClientRect().top
	}, [children])

	return (
		<div ref={ref} className={className}>
			{children}
		</div>
	)
}
