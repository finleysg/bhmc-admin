"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { currentSeason } from "@/lib/constants"
import type { TopPointsEntry } from "@/lib/types"

async function fetchTopPoints(
	season: number,
	category: string,
	top: number,
): Promise<TopPointsEntry[]> {
	const response = await fetch(`/api/points?season=${season}&category=${category}&top=${top}`)
	if (!response.ok) throw new Error("Failed to fetch points")
	return response.json() as Promise<TopPointsEntry[]>
}

export function TopPoints() {
	const [category, setCategory] = useState<"gross" | "net">("gross")

	const { data: points, isLoading } = useQuery({
		queryKey: ["top-points", currentSeason, category],
		queryFn: () => fetchTopPoints(currentSeason, category, 25),
	})

	const sorted = points ? [...points].sort((a, b) => b.total_points - a.total_points) : []

	return (
		<div>
			<Tabs value={category} onValueChange={(v) => setCategory(v as "gross" | "net")}>
				<TabsList className="w-full">
					<TabsTrigger value="gross" className="flex-1">
						Top 25 Gross
					</TabsTrigger>
					<TabsTrigger value="net" className="flex-1">
						Top 25 Net
					</TabsTrigger>
				</TabsList>
				<TabsContent value={category}>
					{isLoading ? (
						<div className="space-y-2 p-4">
							{Array.from({ length: 10 }).map((_, i) => (
								<Skeleton key={i} className="h-6 w-full" />
							))}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Player</TableHead>
									<TableHead className="text-right">Points</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sorted.map((row) => (
									<TableRow key={row.id}>
										<TableCell>
											{row.first_name} {row.last_name}
										</TableCell>
										<TableCell className="text-right">{row.total_points}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
