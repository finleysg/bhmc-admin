import { format } from "date-fns"
import { useForm } from "react-hook-form"

import { zodResolver } from "@hookform/resolvers/zod"

import { ErrorDisplay } from "../components/feedback/error-display"
import { OverlaySpinner } from "../components/spinners/overlay-spinner"
import { useCopyEvent } from "../hooks/use-event-copy"
import { ClubEvent, ClubEventData } from "../models/club-event"
import { getEventTypeName } from "../models/codes"
import { CopyEventData, CopyEventSchema, CopyEventView } from "./copy-event-view"

interface CopyEventProps {
	season: number
	events: ClubEvent[]
	onComplete: (newEvent: ClubEvent) => void
}

export function CopyEventHandler({ events, season, onComplete }: CopyEventProps) {
	const { mutate: copy, error, status } = useCopyEvent()
	const form = useForm<CopyEventData>({
		resolver: zodResolver(CopyEventSchema),
		defaultValues: {
			eventId: "0",
			startDate: format(new Date(), "yyyy-MM-dd"),
		},
	})

	const selectOptions = events.map((e) => {
		return {
			value: e.id,
			name: `${e.startDateString} ${getEventTypeName(e.eventType)}: ${e.name}`,
		}
	})

	const submitHandler = (values: CopyEventData) => {
		const copyArgs = { ...values, season, eventId: +values.eventId }
		copy(copyArgs, {
			onSuccess: (data: ClubEventData) => {
				form.reset()
				onComplete(new ClubEvent(data))
			},
		})
	}

	return (
		<div>
			<OverlaySpinner loading={status === "pending"} />
			<CopyEventView eventOptions={selectOptions} form={form} onSubmit={submitHandler} />
			{error && <ErrorDisplay error={error.message} delay={10000} onClose={() => void 0} />}
		</div>
	)
}
