import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { useSession } from "./auth-client"

export function useAuthenticatedFetch<T>(path: string) {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const router = useRouter()
	const [data, setData] = useState<T | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!signedIn && !isPending) {
			router.push("/sign-in")
		}
	}, [signedIn, isPending, router])

	useEffect(() => {
		if (!signedIn || isPending) return

		const fetchData = async () => {
			try {
				setLoading(true)
				setError(null)
				const res = await fetch(path)
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
	}, [signedIn, isPending, path])

	return { data, loading, error }
}

export function useExcelExport(excelPath: string, filenamePrefix: string) {
	const download = async () => {
		try {
			const response = await fetch(excelPath)
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
