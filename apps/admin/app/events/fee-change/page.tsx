import Link from "next/link"

import type { FeeType } from "@repo/domain/types"

import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { apiGet } from "@/lib/server-api"

import { SeasonSelect } from "../components/season-select"

import { FeeChangeForm } from "./components/fee-change-form"

/** Season Fee Change: one fee type from an old amount to a new one across a season (Event Admin). */
export default async function FeeChangePage({
	searchParams,
}: {
	searchParams: Promise<{ season?: string }>
}) {
	const requested = Number((await searchParams).season)
	const season = Number.isInteger(requested) && requested > 0 ? requested : new Date().getFullYear()
	const feeTypes = await apiGet<FeeType[]>("/fee-types")

	return (
		<div className="mx-auto max-w-4xl space-y-4 md:py-8">
			<div className="flex items-center justify-between">
				<h2 className="font-heading text-2xl font-bold">Change a fee</h2>
				<Button asChild variant="outline">
					<Link href={`/events?season=${season}`}>Back to events</Link>
				</Button>
			</div>
			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="space-y-1.5">
						<CardTitle>{season} season</CardTitle>
						<CardDescription>
							Changes every amount of one fee type that equals the old amount: event fees, override
							amounts, and session fees. Events with registrations, or whose registration has
							opened, are left unchanged; change those in their event&apos;s Fees tab.
						</CardDescription>
					</div>
					<SeasonSelect season={season} />
				</CardHeader>
				<CardContent>
					<FeeChangeForm key={season} season={season} feeTypes={feeTypes} />
				</CardContent>
			</Card>
		</div>
	)
}
