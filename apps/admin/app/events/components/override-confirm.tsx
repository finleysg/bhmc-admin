import { Checkbox } from "@/components/shadcn/checkbox"
import { Field, FieldLabel } from "@/components/shadcn/field"

/**
 * Shown when the API refuses a change because registration has opened: checking it and
 * saving again sends `override`, which is recorded in the audit history.
 */
export function OverrideConfirm({ label = "Save anyway" }: { label?: string }) {
	return (
		<Field orientation="horizontal">
			<Checkbox id="override" name="override" />
			<FieldLabel htmlFor="override">
				{label}: I understand this affects players who may already be registered
			</FieldLabel>
		</Field>
	)
}
