"use client"

import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

export const BACK_NAVIGATION = "__back__"

interface UseRegistrationGuardOptions {
	active: boolean
}

interface UseRegistrationGuardReturn {
	pendingNavigation: string | null
	requestNavigation: (href: string) => void
	cancelNavigation: () => void
	confirmNavigation: () => string | null
}

export function useRegistrationGuard({
	active,
}: UseRegistrationGuardOptions): UseRegistrationGuardReturn {
	const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
	const pendingRef = useRef<string | null>(null)
	const activeRef = useRef(active)
	activeRef.current = active
	const navigatingRef = useRef(false)
	const pathname = usePathname()

	// --- beforeunload ---
	useEffect(() => {
		if (!active) return

		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault()
			e.returnValue = ""
		}

		window.addEventListener("beforeunload", handler)
		return () => {
			window.removeEventListener("beforeunload", handler)
		}
	}, [active])

	// --- Document-level click interception for in-app links ---
	useEffect(() => {
		if (!active) return

		const handler = (e: MouseEvent) => {
			// Walk up from click target to find nearest <a>
			let target = e.target as HTMLElement | null
			while (target) {
				if (target.tagName === "A") {
					const href = (target as HTMLAnchorElement).getAttribute("href")
					if (href && !isRegistrationFlowUrl(href)) {
						e.preventDefault()
						e.stopPropagation()
						pendingRef.current = href
						setPendingNavigation(href)
					}
					return
				}
				target = target.parentElement
			}
		}

		// Use capture phase so we intercept before Next.js Link handles the click
		document.addEventListener("click", handler, true)
		return () => {
			document.removeEventListener("click", handler, true)
		}
	}, [active])

	// --- Browser back/forward button interception ---
	const guardUrlRef = useRef<string | null>(null)

	useEffect(() => {
		if (!active || !isGuardedRegistrationUrl(pathname)) {
			guardUrlRef.current = null
			navigatingRef.current = false
			return
		}

		const handler = () => {
			if (!activeRef.current) return
			if (navigatingRef.current) return
			// Re-push to trap the next back press too
			history.pushState(null, "", location.href)
			pendingRef.current = BACK_NAVIGATION
			setPendingNavigation(BACK_NAVIGATION)
		}

		// Push an extra history entry so the first back press fires popstate
		// on the same page instead of actually navigating away.
		// Only push once per pathname to avoid interfering with router navigations.
		if (guardUrlRef.current !== pathname) {
			history.pushState(null, "", location.href)
			guardUrlRef.current = pathname
		}

		window.addEventListener("popstate", handler)
		return () => {
			window.removeEventListener("popstate", handler)
		}
	}, [active, pathname])

	// --- In-app navigation ---
	const requestNavigation = useCallback((href: string) => {
		if (!activeRef.current) return
		pendingRef.current = href
		setPendingNavigation(href)
	}, [])

	const cancelNavigation = useCallback(() => {
		pendingRef.current = null
		setPendingNavigation(null)
	}, [])

	const confirmNavigation = useCallback(() => {
		navigatingRef.current = true
		const href = pendingRef.current
		pendingRef.current = null
		setPendingNavigation(null)
		return href
	}, [])

	return {
		pendingNavigation,
		requestNavigation,
		cancelNavigation,
		confirmNavigation,
	}
}

/**
 * Returns true if the URL is part of the registration flow
 * (reserve, register, review, payment) under any event path.
 */
export function isRegistrationFlowUrl(url: string | null | undefined): boolean {
	if (!url) return false
	return /\/event\/[^/]+\/[^/]+\/(register|reserve|review|payment)(\/|$)/.test(url)
}

/**
 * Returns true if the URL is a registration page that should have
 * back-button protection (register, review, payment — but NOT reserve,
 * since the guard activates on reserve right before navigating away).
 */
function isGuardedRegistrationUrl(url: string | null | undefined): boolean {
	if (!url) return false
	return /\/event\/[^/]+\/[^/]+\/(register|review|payment)(\/|$)/.test(url)
}
