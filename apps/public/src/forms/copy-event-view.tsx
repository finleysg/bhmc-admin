import { FormEvent } from "react"

import { z } from "zod"

import { InputControl } from "../components/forms/input-control"
import { SelectControl, SelectOption } from "../components/forms/select-control"

export const CopyEventSchema = z.object({
	eventId: z.string().min(1, "We need a source event to copy from."),
	startDate: z.string().min(8, "We need a start date for the new (target) event."),
})
export type CopyEventData = z.infer<typeof CopyEventSchema>

interface CopyEventViewProps {
	eventOptions: SelectOption[]
	formData: CopyEventData
	errors: Record<string, string>
	isSubmitting: boolean
	isDirty: boolean
	onChange: (field: keyof CopyEventData, value: string) => void
	onSubmit: (e: FormEvent) => void
}

export function CopyEventView({
	eventOptions,
	formData,
	errors,
	isSubmitting,
	isDirty,
	onChange,
	onSubmit,
}: CopyEventViewProps) {
	return (
		<div>
			<form onSubmit={onSubmit}>
				<SelectControl
					name="eventId"
					label="Source Event"
					value={formData.eventId}
					onChange={(e) => onChange("eventId", e.target.value)}
					error={errors.eventId}
					options={eventOptions}
				/>
				<InputControl
					name="startDate"
					label="Target Event Date"
					value={formData.startDate}
					onChange={(e) => onChange("startDate", e.target.value)}
					error={errors.startDate}
					type="date"
				/>
				<div className="d-flex justify-content-end">
					<button type="submit" className="btn btn-primary" disabled={isSubmitting || !isDirty}>
						Copy
					</button>
				</div>
			</form>
		</div>
	)
}
