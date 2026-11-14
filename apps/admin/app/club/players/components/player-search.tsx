"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useOptimistic, useRef, useTransition } from "react"
import { useDebounceCallback } from "usehooks-ts"

import { Loader2, Search } from "lucide-react"

import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"

interface PlayerSearchProps {
	query: string
	membersOnly: boolean
}

/** Search controls that keep their state in the URL (?q=…&all=1). */
export function PlayerSearch({ query, membersOnly }: PlayerSearchProps) {
	const router = useRouter()
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()
	const [optimisticMembersOnly, setOptimisticMembersOnly] = useOptimistic(membersOnly)

	// The latest search we asked for. window.location only changes when a navigation
	// commits, so merging into it would drop a change still in flight.
	const requested = useRef({ q: query, membersOnly })

	const input = useRef<HTMLInputElement>(null)

	// Adopt URL changes that came from elsewhere (a link, back/forward) once ours have settled.
	// A committed query that isn't the one we last requested came from outside, so show it;
	// otherwise leave the box alone, since the user may have typed more while it loaded.
	useEffect(() => {
		if (isPending) return
		if (query !== requested.current.q && input.current) input.current.value = query
		requested.current = { q: query, membersOnly }
	}, [query, membersOnly, isPending])

	const navigate = (change: { q?: string; membersOnly?: boolean }) => {
		const next = { ...requested.current, ...change }
		requested.current = next

		const params = new URLSearchParams()
		if (next.q) params.set("q", next.q)
		if (!next.membersOnly) params.set("all", "1")
		const search = params.toString()
		startTransition(() => {
			if (change.membersOnly !== undefined) setOptimisticMembersOnly(change.membersOnly)
			router.replace(search ? `${pathname}?${search}` : pathname)
		})
	}

	const searchFor = useDebounceCallback((q: string) => navigate({ q }), 300)

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
			<div className="grid flex-1 gap-2">
				<Label htmlFor="player-search">Search Players</Label>
				<div className="relative">
					<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						ref={input}
						id="player-search"
						className="bg-card pr-9 pl-9"
						placeholder="Search by name, email, or GHIN (min 3 characters)..."
						defaultValue={query}
						onChange={(e) => searchFor(e.target.value)}
					/>
					{isPending && (
						<Loader2
							className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
							aria-label="Searching"
						/>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 sm:pb-2">
				<Checkbox
					id="members-only"
					checked={optimisticMembersOnly}
					onCheckedChange={(checked) => navigate({ membersOnly: checked === true })}
				/>
				<Label htmlFor="members-only">Members only</Label>
			</div>
		</div>
	)
}
