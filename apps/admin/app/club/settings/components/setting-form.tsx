"use client"

import { startTransition, useActionState } from "react"
import { toast } from "sonner"

import type { AdminSettingView } from "@repo/domain/types"

import { Button } from "@/components/shadcn/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import type { FormState } from "@/lib/form-state"

import { updateSetting } from "../actions"

export function SettingForm({ setting }: { setting: AdminSettingView }) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState, formData: FormData) => {
			const result = await updateSetting(setting.key, prev, formData)
			if (result.status === "success") toast.success(result.message)
			return result
		},
		{ status: "idle" },
	)
	const id = `setting-${setting.key}`
	const error = state.status === "error" ? state.message : undefined

	return (
		<form
			// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
			onSubmit={(e) => {
				e.preventDefault()
				const formData = new FormData(e.currentTarget)
				startTransition(() => formAction(formData))
			}}
			noValidate
		>
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={id}>{setting.label}</FieldLabel>
				<FieldDescription>{setting.description}</FieldDescription>
				<div className="flex items-center gap-3">
					<Input
						id={id}
						name="value"
						type="number"
						inputMode="numeric"
						min={setting.min}
						max={setting.max}
						step={1}
						defaultValue={setting.value}
						aria-invalid={!!error}
						disabled={isPending}
						className="w-28"
					/>
					{setting.unit && <span className="text-sm text-muted-foreground">{setting.unit}</span>}
					<Button type="submit" disabled={isPending} className="ml-auto">
						{isPending ? "Saving..." : "Save"}
					</Button>
				</div>
				<FieldError>{error}</FieldError>
			</Field>
		</form>
	)
}
