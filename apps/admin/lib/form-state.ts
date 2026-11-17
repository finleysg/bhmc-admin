/** Result of a Server Action form submission, rendered via useActionState (ADR 0005). */
export interface FormState<Field extends string = string> {
	status: "idle" | "success" | "error"
	message?: string
	fieldErrors?: Partial<Record<Field, string>>
	/** The API refused the change because registration has opened; it can be made with an override. */
	canOverride?: boolean
}
