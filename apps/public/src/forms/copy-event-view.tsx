import { UseFormReturn } from "react-hook-form"
import { z } from "zod"

import { InputControl } from "../components/forms/input-control"
import { SelectControl, SelectOption } from "../components/forms/select-control"

interface CopyEventViewProps {
	eventOptions: SelectOption[]
	form: UseFormReturn<CopyEventData>
	onSubmit: (values: CopyEventData) => void
}

export const CopyEventSchema = z.object({
	eventId: z.string().min(1, "We need a source event to copy from."),
	startDate: z.string().min(8, "We need a start date for the new (target) event."),
})
export type CopyEventData = z.infer<typeof CopyEventSchema>

export function CopyEventView({ eventOptions, form, onSubmit }: CopyEventViewProps) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	console.log(formState.errors)

	return (
		<div>
			<form onSubmit={handleSubmit(onSubmit)}>
				<SelectControl
					name="eventId"
					label="Source Event"
					register={register("eventId")}
					error={formErrors.eventId}
					options={eventOptions}
				/>
				<InputControl
					name="startDate"
					label="Target Event Date"
					register={register("startDate")}
					error={formErrors.startDate}
					type="date"
				/>
				<div className="d-flex justify-content-end">
					<button
						type="submit"
						className="btn btn-primary"
						disabled={isSubmitting || !formState.isDirty || !formState.isValid}
					>
						Copy
					</button>
				</div>
			</form>
		</div>
	)
}
