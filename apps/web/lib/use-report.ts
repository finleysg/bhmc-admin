import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "./auth-context"

export function useAuthenticatedFetch<T>(path: string | null) {
	const { isAuthenticated, isLoading: isPending, logout } = useAuth()
	const router = useRouter()
	const pathname = usePathname()
	const [data, setData] = useState<T | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (isPending || !path) return

		const fetchData = async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await fetch(path)
				if (res.status === 401) {
					await logout()
					router.push(`/sign-in?returnUrl=${encodeURIComponent(pathname)}`)
					return
				}
				if (!res.ok) {
					throw new Error(`Failed to fetch report: ${res.statusText}`)
				}
				const json = (await res.json()) as T
				setData(json)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error")
			} finally {
				setLoading(false)
			}
		}

		void fetchData()
	}, [isAuthenticated, isPending, path, logout, router, pathname])

	return { data, loading, error }
}

export function useExcelExport(excelPath: string, filenamePrefix: string) {
	const { logout } = useAuth()
	const router = useRouter()
	const pathname = usePathname()

	const download = async () => {
		try {
			const response = await fetch(excelPath)
			if (response.status === 401) {
				await logout()
				router.push(`/sign-in?returnUrl=${encodeURIComponent(pathname)}`)
				return
			}
			if (!response.ok) {
				throw new Error(`Failed to download Excel: ${response.statusText}`)
			}
			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `${filenamePrefix}.xlsx`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (error) {
			console.error("Export failed:", error)
			alert("Failed to export Excel file. Please try again.")
		}
	}

	return { download }
}

export function formatCurrency(amount: number | undefined) {
	if (amount === undefined || amount === null) return ""
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount)
}
