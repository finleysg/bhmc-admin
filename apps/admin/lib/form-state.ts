/** Result of a Server Action form submission, rendered via useActionState (ADR 0005). */
export interface FormState<Field extends string = string> {
	status: "idle" | "success" | "error"
	message?: string
	fieldErrors?: Partial<Record<Field, string>>
}
