import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalendarHeaderProps {
	monthName: string
	year: number
	prev: { year: number; month: string }
	next: { year: number; month: string }
}

export function CalendarHeader({ monthName, year, prev, next }: CalendarHeaderProps) {
	return (
		<div className="mb-4 flex items-center justify-between">
			<Button variant="ghost" size="icon" asChild>
				<Link href={`/calendar/${prev.year}/${prev.month}`}>
					<ChevronLeft className="size-5" />
				</Link>
			</Button>
			<h2 className="text-xl font-semibold text-primary">
				{monthName} {year}
			</h2>
			<Button variant="ghost" size="icon" asChild>
				<Link href={`/calendar/${next.year}/${next.month}`}>
					<ChevronRight className="size-5" />
				</Link>
			</Button>
		</div>
	)
}
