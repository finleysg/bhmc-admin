"use client"

import { startTransition, useActionState, useState, useTransition } from "react"
import { toast } from "sonner"

import { FeeRestrictionChoices, type EventFee, type FeeType } from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/shadcn/dialog"
import { Field, FieldError, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"
import type { FormState } from "@/lib/form-state"

import { NONE } from "../../../event-settings"
import { deleteEventFee, saveEventFee, type FeeField } from "../actions"

const money = (amount: number) => `$${amount.toFixed(2)}`

export function FeesPanel({
	eventId,
	fees,
	feeTypes,
}: {
	eventId: number
	fees: EventFee[]
	feeTypes: FeeType[]
}) {
	const used = new Set(fees.map((f) => f.feeTypeId))

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<p className="text-sm text-muted-foreground">
					Each registration keeps the amount it was charged, so changing a fee affects only new
					charges.
				</p>
				<FeeDialog
					eventId={eventId}
					feeTypes={feeTypes.filter((t) => !used.has(t.id))}
					trigger={<Button size="sm">Add fee</Button>}
				/>
			</div>
			{fees.length === 0 ? (
				<p className="py-4 text-center text-muted-foreground">No fees yet.</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Fee</TableHead>
							<TableHead className="text-right">Amount</TableHead>
							<TableHead>Required</TableHead>
							<TableHead>Override</TableHead>
							<TableHead className="sr-only">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{fees.map((fee) => (
							<TableRow key={fee.id}>
								<TableCell>{fee.feeType?.name}</TableCell>
								<TableCell className="text-right">{money(fee.amount)}</TableCell>
								<TableCell>{fee.isRequired ? "Yes" : "No"}</TableCell>
								<TableCell>
									{fee.overrideAmount != null && fee.overrideRestriction
										? `${money(fee.overrideAmount)} for ${fee.overrideRestriction}`
										: "—"}
								</TableCell>
								<TableCell className="space-x-2 text-right whitespace-nowrap">
									<FeeDialog
										eventId={eventId}
										fee={fee}
										feeTypes={feeTypes.filter((t) => t.id === fee.feeTypeId || !used.has(t.id))}
										trigger={
											<Button size="sm" variant="outline">
												Edit
											</Button>
										}
									/>
									<DeleteFeeDialog eventId={eventId} fee={fee} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}

function FeeDialog({
	eventId,
	fee,
	feeTypes,
	trigger,
}: {
	eventId: number
	fee?: EventFee
	feeTypes: FeeType[]
	trigger: React.ReactNode
}) {
	const [open, setOpen] = useState(false)
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{fee ? `Edit ${fee.feeType?.name ?? "fee"}` : "Add fee"}</DialogTitle>
				</DialogHeader>
				<FeeForm eventId={eventId} fee={fee} feeTypes={feeTypes} onSaved={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	)
}

function FeeForm({
	eventId,
	fee,
	feeTypes,
	onSaved,
}: {
	eventId: number
	fee?: EventFee
	feeTypes: FeeType[]
	onSaved: () => void
}) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState<FeeField>, formData: FormData) => {
			const result = await saveEventFee(eventId, fee?.id ?? null, prev, formData)
			if (result.status === "success") {
				toast.success(result.message)
				onSaved()
			}
			return result
		},
		{ status: "idle" },
	)
	const errors = state.fieldErrors ?? {}

	return (
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
			<fieldset disabled={isPending} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field data-invalid={!!errors.feeTypeId} className="sm:col-span-2">
					<FieldLabel htmlFor="feeTypeId">Fee type</FieldLabel>
					<Select name="feeTypeId" defaultValue={fee ? String(fee.feeTypeId) : undefined}>
						<SelectTrigger id="feeTypeId" className="w-full" aria-invalid={!!errors.feeTypeId}>
							<SelectValue placeholder="Choose..." />
						</SelectTrigger>
						<SelectContent>
							{feeTypes.map((t) => (
								<SelectItem key={t.id} value={String(t.id)}>
									{t.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<FieldError>{errors.feeTypeId}</FieldError>
				</Field>
				<Field data-invalid={!!errors.amount}>
					<FieldLabel htmlFor="amount">Amount</FieldLabel>
					<Input
						id="amount"
						name="amount"
						type="number"
						inputMode="decimal"
						min={0}
						step={0.01}
						defaultValue={fee?.amount ?? ""}
						aria-invalid={!!errors.amount}
					/>
					<FieldError>{errors.amount}</FieldError>
				</Field>
				<Field orientation="horizontal" className="sm:pt-7">
					<Checkbox id="isRequired" name="isRequired" defaultChecked={fee?.isRequired ?? false} />
					<FieldLabel htmlFor="isRequired">Required</FieldLabel>
				</Field>
				<Field data-invalid={!!errors.overrideAmount}>
					<FieldLabel htmlFor="overrideAmount">Override amount</FieldLabel>
					<Input
						id="overrideAmount"
						name="overrideAmount"
						type="number"
						inputMode="decimal"
						min={0}
						step={0.01}
						defaultValue={fee?.overrideAmount ?? ""}
						aria-invalid={!!errors.overrideAmount}
					/>
					<FieldError>{errors.overrideAmount}</FieldError>
				</Field>
				<Field data-invalid={!!errors.overrideRestriction}>
					<FieldLabel htmlFor="overrideRestriction">Override applies to</FieldLabel>
					<Select name="overrideRestriction" defaultValue={fee?.overrideRestriction ?? NONE}>
						<SelectTrigger id="overrideRestriction" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NONE}>No override</SelectItem>
							{Object.values(FeeRestrictionChoices)
								.filter((r) => r !== FeeRestrictionChoices.NONE)
								.map((r) => (
									<SelectItem key={r} value={r}>
										{r}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
					<FieldError>{errors.overrideRestriction}</FieldError>
				</Field>
			</fieldset>
			<DialogFooter>
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving..." : "Save"}
				</Button>
			</DialogFooter>
		</form>
	)
}

function DeleteFeeDialog({ eventId, fee }: { eventId: number; fee: EventFee }) {
	const [open, setOpen] = useState(false)
	const [error, setError] = useState<string>()
	const [isPending, startDelete] = useTransition()

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				setError(undefined)
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Delete
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {fee.feeType?.name ?? "fee"}?</DialogTitle>
					<DialogDescription>
						A fee that registrations have been charged, or that a session overrides, cannot be
						deleted.
					</DialogDescription>
				</DialogHeader>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
					<Button
						variant="destructive"
						disabled={isPending}
						onClick={() =>
							startDelete(async () => {
								const result = await deleteEventFee(eventId, fee.id)
								if (result.status === "success") {
									toast.success(result.message)
									setOpen(false)
								} else {
									setError(result.message)
								}
							})
						}
					>
						{isPending ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
