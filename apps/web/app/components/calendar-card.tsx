"use client"

import "react-day-picker/dist/style.css"

import { DayPicker } from "react-day-picker"
import { HelperText } from "@/components/ui/helper-text"

interface CalendarCardProps {
	selectedDate: Date
	onDateSelect: (date: Date | undefined) => void
	eventDates?: Date[]
	onMonthChange?: (date: Date) => void
}

export default function CalendarCard({
	selectedDate,
	onDateSelect,
	eventDates,
	onMonthChange,
}: CalendarCardProps) {
	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body">
				<HelperText>Choose the tournament date to get started</HelperText>

				<DayPicker
					mode="single"
					selected={selectedDate}
					onSelect={onDateSelect}
					onMonthChange={onMonthChange}
					modifiers={{ hasEvent: eventDates ?? [] }}
					modifiersClassNames={{ hasEvent: "bg-accent/20 font-semibold" }}
					classNames={{
						today: "text-accent",
						day_button: "hover:bg-base-200",
						selected: "bg-primary! text-primary-content!",
						button_next: "hover:bg-primary hover:text-primary-content",
						button_previous: "hover:bg-primary hover:text-primary-content",
						chevron: "fill-primary",
					}}
				/>

				{selectedDate && (
					<div className="mt-4 p-3 bg-base-200 rounded-lg">
						<p className="text-sm font-medium">
							Selected:{" "}
							{selectedDate.toLocaleDateString("en-US", {
								weekday: "long",
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
