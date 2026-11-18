"use client"

import { startTransition, useActionState, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import type {
	InspectedFee,
	InspectedSlot,
	InspectorEventFee,
	InspectorSlotStatus,
} from "@repo/domain/types"

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
import type { FormState } from "@/lib/form-state"

import { addFee, removeFee, setSlotStatus, type AddFeeField } from "../actions"

const money = (amount: number) => `$${amount.toFixed(2)}`

const STATUS_CHOICES: { value: InspectorSlotStatus; label: string; detail: string }[] = [
	{ value: "R", label: "Reserved", detail: "The player keeps the slot." },
	{
		value: "A",
		label: "Available",
		detail: "The player and registration are removed and unpaid fees detached. Others can take it.",
	},
	{
		value: "U",
		label: "Unavailable",
		detail: "The player and registration are removed and unpaid fees detached. No one can take it.",
	},
]

interface Ids {
	registrationId: number
	eventId: number
}

/** Runs an action, closing the dialog on success and showing the error in it otherwise. */
function useDialogAction() {
	const [open, setOpen] = useState(false)
	const [error, setError] = useState<string>()
	const [isPending, startTransition] = useTransition()
	const run = (action: () => Promise<FormState>) =>
		startTransition(async () => {
			const result = await action()
			if (result.status === "success") {
				toast.success(result.message)
				setOpen(false)
			} else setError(result.message)
		})
	const onOpenChange = (next: boolean) => {
		setOpen(next)
		setError(undefined)
	}
	return { open, onOpenChange, error, isPending, run }
}

function ErrorAlert({ message }: { message?: string }) {
	if (!message) return null
	return (
		<Alert variant="destructive">
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	)
}

/** Sets the slot's status, after confirming what the change does. */
export function SlotStatusDialog({
	ids,
	slot,
	canChoose,
}: {
	ids: Ids
	slot: InspectedSlot
	/** Players choose slots; otherwise a slot can only be made Reserved. */
	canChoose: boolean
}) {
	const { open, onOpenChange, error, isPending, run } = useDialogAction()
	const [status, setStatus] = useState<InspectorSlotStatus>()
	const choices = STATUS_CHOICES.filter(
		(c) => c.value !== slot.status && (canChoose || c.value === "R"),
	)
	const choice = choices.find((c) => c.value === status)
	if (choices.length === 0) return null

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next)
				setStatus(undefined)
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Set status
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Set the status of {slot.playerName ?? `slot ${slot.id}`}</DialogTitle>
					<DialogDescription>Recorded in the audit history.</DialogDescription>
				</DialogHeader>
				<ErrorAlert message={error} />
				<Field>
					<FieldLabel htmlFor={`status-${slot.id}`}>Status</FieldLabel>
					<Select value={status} onValueChange={(v) => setStatus(v as InspectorSlotStatus)}>
						<SelectTrigger id={`status-${slot.id}`} className="w-full">
							<SelectValue placeholder="Choose..." />
						</SelectTrigger>
						<SelectContent>
							{choices.map((c) => (
								<SelectItem key={c.value} value={c.value}>
									{c.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{choice && <p className="text-sm text-muted-foreground">{choice.detail}</p>}
				</Field>
				<DialogFooter>
					<Button
						disabled={!status || isPending}
						onClick={() =>
							run(() => setSlotStatus(ids.registrationId, ids.eventId, slot.id, status!))
						}
					>
						{isPending ? "Saving..." : "Set status"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

/** Adds an event fee to the slot, recorded as paid outside Stripe. */
export function AddFeeDialog({
	ids,
	slot,
	eventFees,
}: {
	ids: Ids
	slot: InspectedSlot
	eventFees: InspectorEventFee[]
}) {
	const [open, setOpen] = useState(false)
	const [waived, setWaived] = useState(false)
	const formRef = useRef<HTMLFormElement>(null)
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState<AddFeeField>, formData: FormData) => {
			const result = await addFee(ids.registrationId, ids.eventId, slot.id, prev, formData)
			if (result.status === "success") {
				toast.success(result.message)
				setOpen(false)
			}
			return result
		},
		{ status: "idle" },
	)
	const errors = state.fieldErrors ?? {}
	const has = new Set(slot.fees.map((f) => f.eventFeeId))
	const choices = eventFees.filter((f) => !has.has(f.id))
	if (choices.length === 0) return null

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				setWaived(false)
			}}
		>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					Add fee
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add a fee for {slot.playerName}</DialogTitle>
					<DialogDescription>
						Recorded as paid outside Stripe, at the player&apos;s amount for the fee, or waived at
						$0. No one is charged or emailed.
					</DialogDescription>
				</DialogHeader>
				<form
					ref={formRef}
					// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
					onSubmit={(e) => {
						e.preventDefault()
						const formData = new FormData(formRef.current!)
						startTransition(() => formAction(formData))
					}}
					className="space-y-4"
					noValidate
				>
					{state.status === "error" && !state.fieldErrors && <ErrorAlert message={state.message} />}
					<Field data-invalid={!!errors.eventFeeId}>
						<FieldLabel htmlFor={`fee-${slot.id}`}>Fee</FieldLabel>
						<Select name="eventFeeId">
							<SelectTrigger
								id={`fee-${slot.id}`}
								className="w-full"
								aria-invalid={!!errors.eventFeeId}
							>
								<SelectValue placeholder="Choose..." />
							</SelectTrigger>
							<SelectContent>
								{choices.map((f) => (
									<SelectItem key={f.id} value={String(f.id)}>
										{f.feeTypeName} ({money(f.amount)})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError>{errors.eventFeeId}</FieldError>
					</Field>
					<Field orientation="horizontal">
						<Checkbox
							id={`waived-${slot.id}`}
							name="waived"
							checked={waived}
							onCheckedChange={(checked) => setWaived(checked === true)}
						/>
						<FieldLabel htmlFor={`waived-${slot.id}`}>
							Waive this fee (recorded at $0, not counted as money collected)
						</FieldLabel>
					</Field>
					{!waived && (
						<Field data-invalid={!!errors.paidBy}>
							<FieldLabel htmlFor={`paid-by-${slot.id}`}>How it was paid</FieldLabel>
							<Input
								id={`paid-by-${slot.id}`}
								name="paidBy"
								placeholder="Cash, Check, Venmo..."
								maxLength={40}
								aria-invalid={!!errors.paidBy}
							/>
							<FieldError>{errors.paidBy}</FieldError>
						</Field>
					)}
					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : waived ? "Waive fee" : "Add fee"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

/** Removes a fee from its slot; a paid Stripe fee can be refunded first. */
export function RemoveFeeDialog({
	ids,
	fee,
	stripePaid,
}: {
	ids: Ids
	fee: InspectedFee
	/** The fee is paid, through Stripe, so it can be refunded. */
	stripePaid: boolean
}) {
	const { open, onOpenChange, error, isPending, run } = useDialogAction()
	const remove = (refund: boolean) =>
		run(() => removeFee(ids.registrationId, ids.eventId, fee.id, refund))

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost">
					Remove
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Remove {fee.feeTypeName} ({money(fee.amount)})?
					</DialogTitle>
					<DialogDescription>
						{fee.isPaid
							? stripePaid
								? `It was paid through Stripe. Refund ${money(fee.amount)} to the player's card, or remove it without a refund.`
								: "It was paid outside Stripe, so any refund is settled directly with the player."
							: "It is not paid."}{" "}
						The fee stays on its payment record. Recorded in the audit history.
					</DialogDescription>
				</DialogHeader>
				<ErrorAlert message={error} />
				<DialogFooter>
					<Button
						variant={stripePaid ? "outline" : "destructive"}
						disabled={isPending}
						onClick={() => remove(false)}
					>
						{fee.isPaid ? "Remove without refund" : "Remove"}
					</Button>
					{stripePaid && (
						<Button variant="destructive" disabled={isPending} onClick={() => remove(true)}>
							{isPending ? "Refunding..." : "Refund and remove"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
