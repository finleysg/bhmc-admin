"use client"

import { startTransition, useActionState } from "react"
import { toast } from "sonner"

import type { Course } from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Field, FieldLabel } from "@/components/shadcn/field"
import type { FormState } from "@/lib/form-state"

import { setEventCourses } from "../actions"

export function CoursesPanel({
	eventId,
	courses,
	selected,
}: {
	eventId: number
	courses: Course[]
	selected: Course[]
}) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState, formData: FormData) => {
			const result = await setEventCourses(eventId, prev, formData)
			if (result.status === "success") toast.success(result.message)
			return result
		},
		{ status: "idle" },
	)
	const selectedIds = new Set(selected.map((c) => c.id))

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Required for tee-time and shotgun events. A course with slots for this event cannot be
				removed until its slots are deleted.
			</p>
			<form
				// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
				onSubmit={(e) => {
					e.preventDefault()
					const formData = new FormData(e.currentTarget)
					startTransition(() => formAction(formData))
				}}
				className="space-y-4"
			>
				{state.status === "error" && (
					<Alert variant="destructive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}
				<fieldset disabled={isPending} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					{courses.map((course) => (
						<Field key={course.id} orientation="horizontal">
							<Checkbox
								id={`course-${course.id}`}
								name="courseIds"
								value={String(course.id)}
								defaultChecked={selectedIds.has(course.id)}
							/>
							<FieldLabel htmlFor={`course-${course.id}`}>{course.name}</FieldLabel>
						</Field>
					))}
				</fieldset>
				<div className="flex justify-end">
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : "Save courses"}
					</Button>
				</div>
			</form>
		</div>
	)
}
