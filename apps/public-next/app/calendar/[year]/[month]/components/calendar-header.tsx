"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { getMonthName } from "@/lib/calendar"

interface CalendarHeaderProps {
	monthName: string
	year: number
	currentYear: number
	prev: { year: number; month: string }
	next: { year: number; month: string }
}

export function CalendarHeader({ monthName, year, currentYear, prev, next }: CalendarHeaderProps) {
	const router = useRouter()
	const month = monthName.toLowerCase()
	const months = Array.from({ length: 12 }, (_, index) => getMonthName(index))
	const firstYear = Math.min(2017, year)
	const lastYear = Math.max(currentYear + 1, year)
	const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index)

	return (
		<div className="mb-4 flex items-center justify-between">
			<Button variant="ghost" size="icon" asChild>
				<Link href={`/calendar/${prev.year}/${prev.month}`} aria-label="Previous month">
					<ChevronLeft className="size-5" />
				</Link>
			</Button>
			<h2 className="sr-only">
				{monthName} {year}
			</h2>
			<div className="flex items-center gap-2">
				<Select value={month} onValueChange={(value) => router.push(`/calendar/${year}/${value}`)}>
					<SelectTrigger aria-label="Calendar month" className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{months.map((name) => (
								<SelectItem key={name} value={name.toLowerCase()}>
									{name}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<Select
					value={String(year)}
					onValueChange={(value) => router.push(`/calendar/${value}/${month}`)}
				>
					<SelectTrigger aria-label="Calendar year" className="w-24">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{years.map((value) => (
								<SelectItem key={value} value={String(value)}>
									{value}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
			<Button variant="ghost" size="icon" asChild>
				<Link href={`/calendar/${next.year}/${next.month}`} aria-label="Next month">
					<ChevronRight className="size-5" />
				</Link>
			</Button>
		</div>
	)
}
