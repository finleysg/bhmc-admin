"use client"

import { useEffect, useState } from "react"
import { useDebounceValue } from "usehooks-ts"

import type { Player } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { Alert } from "@/app/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PageLayout } from "@/components/ui/page-layout"
import { PlayerTable } from "./components/player-table"

export default function PlayersPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const [searchText, setSearchText] = useState("")
	const [membersOnly, setMembersOnly] = useState(true)
	const [players, setPlayers] = useState<Player[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [debouncedSearchText] = useDebounceValue(searchText, 300)

	useEffect(() => {
		const fetchPlayers = async () => {
			if (debouncedSearchText.length < 3) {
				setPlayers([])
				return
			}

			setIsLoading(true)
			setError(null)
			try {
				const params = new URLSearchParams({
					searchText: debouncedSearchText,
					isMember: membersOnly.toString(),
				})
				const response = await fetch(`/api/registration/players?${params}`)
				if (response.ok) {
					const data = (await response.json()) as Player[]
					setPlayers(data)
				} else {
					setError("Failed to search players")
					setPlayers([])
				}
			} catch {
				setError("Failed to search players")
				setPlayers([])
			} finally {
				setIsLoading(false)
			}
		}

		void fetchPlayers()
	}, [debouncedSearchText, membersOnly])

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	return (
		<PageLayout maxWidth="5xl">
			{error && (
				<Alert type="error" className="mb-4">
					{error}
				</Alert>
			)}
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
				<div className="flex-1">
					<label className="label">
						<span className="label-text">Search Players</span>
					</label>
					<input
						type="text"
						className="input input-bordered w-full"
						placeholder="Search by name, email, or GHIN (min 3 characters)..."
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
					/>
				</div>
				<label className="flex cursor-pointer items-center gap-2 pb-1">
					<input
						type="checkbox"
						className="toggle toggle-primary"
						checked={membersOnly}
						onChange={(e) => setMembersOnly(e.target.checked)}
					/>
					<span className="label-text">Members only</span>
				</label>
			</div>

			{isLoading && <LoadingSpinner size="lg" />}

			{!isLoading && debouncedSearchText.length >= 3 && <PlayerTable players={players} />}

			{!isLoading && debouncedSearchText.length < 3 && (
				<p className="text-center text-base-content/50 py-8">
					Type at least 3 characters to search
				</p>
			)}
		</PageLayout>
	)
}
