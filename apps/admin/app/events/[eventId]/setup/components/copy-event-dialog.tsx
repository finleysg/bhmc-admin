"use client"

import { startTransition, useActionState } from "react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/shadcn/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import type { FormState } from "@/lib/form-state"

import { copyEvent, type CopyField } from "../actions"

/** Copies the event to a new date; on success the action opens the copy's workspace. */
export function CopyEventDialog({ eventId, name }: { eventId: number; name: string }) {
	const [state, formAction, isPending] = useActionState(
		(prev: FormState<CopyField>, formData: FormData) => copyEvent(eventId, prev, formData),
		{ status: "idle" },
	)
	const errors = state.fieldErrors ?? {}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Copy event
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Copy {name}</DialogTitle>
					<DialogDescription>
						Copies the settings, courses, fees, and sessions. Signup and payment dates keep their
						offsets from the event date. The copy is Scheduled, with no Golf Genius link, and has no
						registrations or slots.
					</DialogDescription>
				</DialogHeader>
				<form
					// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
					onSubmit={(e) => {
						e.preventDefault()
						const formData = new FormData(e.currentTarget)
						startTransition(() => formAction(formData))
					}}
					className="space-y-4"
					noValidate
				>
					{state.status === "error" && (
						<Alert variant="destructive">
							<AlertDescription>{state.message}</AlertDescription>
						</Alert>
					)}
					<fieldset disabled={isPending} className="space-y-4">
						<Field data-invalid={!!errors.startDate}>
							<FieldLabel htmlFor="copy-startDate">New date</FieldLabel>
							<Input
								id="copy-startDate"
								name="startDate"
								type="date"
								aria-invalid={!!errors.startDate}
							/>
							<FieldError>{errors.startDate}</FieldError>
						</Field>
						<Field data-invalid={!!errors.name}>
							<FieldLabel htmlFor="copy-name">Name</FieldLabel>
							<Input id="copy-name" name="name" defaultValue={name} maxLength={100} />
							<FieldDescription>An event name can be used only once per date.</FieldDescription>
							<FieldError>{errors.name}</FieldError>
						</Field>
					</fieldset>
					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Copying..." : "Copy"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
