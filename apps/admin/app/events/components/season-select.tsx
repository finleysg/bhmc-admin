"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"

function seasons(): number[] {
	const years: number[] = []
	for (let y = new Date().getFullYear() + 1; y >= 2020; y--) years.push(y)
	return years
}

/** Keeps the selected season in the URL (ADR 0005). */
export function SeasonSelect({ season }: { season: number }) {
	const router = useRouter()
	const pathname = usePathname()
	const [isPending, startTransition] = useTransition()

	return (
		<Select
			value={String(season)}
			disabled={isPending}
			onValueChange={(value) => startTransition(() => router.push(`${pathname}?season=${value}`))}
		>
			<SelectTrigger className="w-28" aria-label="Season">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{seasons().map((y) => (
					<SelectItem key={y} value={String(y)}>
						{y}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
