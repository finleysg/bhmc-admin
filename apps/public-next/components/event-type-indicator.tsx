import { cn } from "@/lib/utils"
import { getEventTypeColor, getEventTypeName } from "@/lib/event-utils"

interface EventTypeIndicatorProps {
	eventType: string
	className?: string
}

export function EventTypeIndicator({ eventType, className }: EventTypeIndicatorProps) {
	return (
		<span
			className={cn(
				"inline-block rounded px-1.5 py-0.5 text-xs font-medium",
				getEventTypeColor(eventType),
				className,
			)}
			title={getEventTypeName(eventType)}
		>
			{getEventTypeName(eventType)}
		</span>
	)
}
