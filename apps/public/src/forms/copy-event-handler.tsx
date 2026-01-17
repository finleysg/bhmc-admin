import { format } from "date-fns"
import { FormEvent, useState } from "react"

import { ErrorDisplay } from "../components/feedback/error-display"
import { OverlaySpinner } from "../components/spinners/overlay-spinner"
import { useCopyEvent } from "../hooks/use-event-copy"
import { ClubEvent, ClubEventData } from "../models/club-event"
import { getEventTypeName } from "../models/codes"
import { formatZodErrors } from "../utils/form-utils"
import { CopyEventData, CopyEventSchema, CopyEventView } from "./copy-event-view"

interface CopyEventProps {
	season: number
	events: ClubEvent[]
	onComplete: (newEvent: ClubEvent) => void
}

export function CopyEventHandler({ events, season, onComplete }: CopyEventProps) {
	const { mutate: copy, error, status } = useCopyEvent()

	const [formData, setFormData] = useState<CopyEventData>({
		eventId: "0",
		startDate: format(new Date(), "yyyy-MM-dd"),
	})
	const [errors, setErrors] = useState<Record<string, string>>({})

	const selectOptions = events.map((e) => {
		return {
			value: e.id,
			name: `${e.startDateString} ${getEventTypeName(e.eventType)}: ${e.name}`,
		}
	})

	const handleChange = (field: keyof CopyEventData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = CopyEventSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		const copyArgs = { ...result.data, season, eventId: +result.data.eventId }
		copy(copyArgs, {
			onSuccess: (data: ClubEventData) => {
				setFormData({ eventId: "0", startDate: format(new Date(), "yyyy-MM-dd") })
				onComplete(new ClubEvent(data))
			},
		})
	}

	const isDirty = formData.eventId !== "0"

	return (
		<div>
			<OverlaySpinner loading={status === "pending"} />
			<CopyEventView
				eventOptions={selectOptions}
				formData={formData}
				errors={errors}
				isSubmitting={status === "pending"}
				isDirty={isDirty}
				onChange={handleChange}
				onSubmit={handleSubmit}
			/>
			{error && <ErrorDisplay error={error.message} delay={10000} onClose={() => void 0} />}
		</div>
	)
}
