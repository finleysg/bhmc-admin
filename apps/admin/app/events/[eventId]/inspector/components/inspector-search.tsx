"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useTransition } from "react"
import { useDebounceCallback } from "usehooks-ts"

import { Loader2, Search } from "lucide-react"

import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"

/** Player search that keeps its state in the URL (?q=…). */
export function InspectorSearch({ query }: { query: string }) {
	const router = useRouter()
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()
	const requested = useRef(query)
	const input = useRef<HTMLInputElement>(null)

	// Adopt URL changes from elsewhere (a link, back/forward) once ours have settled.
	useEffect(() => {
		if (isPending) return
		if (query !== requested.current && input.current) input.current.value = query
		requested.current = query
	}, [query, isPending])

	const searchFor = useDebounceCallback((q: string) => {
		requested.current = q
		const search = q ? `?${new URLSearchParams({ q })}` : ""
		startTransition(() => router.replace(`${pathname}${search}`))
	}, 300)

	return (
		<div className="grid gap-2">
			<Label htmlFor="inspector-search">Player</Label>
			<div className="relative">
				<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					ref={input}
					id="inspector-search"
					className="bg-card pr-9 pl-9"
					placeholder="Name, GHIN, or email..."
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
	)
}
