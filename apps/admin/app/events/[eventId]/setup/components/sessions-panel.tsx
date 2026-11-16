"use client"

import { startTransition, useActionState, useState, useTransition } from "react"
import { toast } from "sonner"

import type { EventFee, EventSessionWithFees } from "@repo/domain/types"

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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"
import type { FormState } from "@/lib/form-state"

import { deleteSession, saveSession, type SessionField } from "../actions"

const money = (amount: number) => `$${amount.toFixed(2)}`

export function SessionsPanel({
	eventId,
	sessions,
	fees,
}: {
	eventId: number
	sessions: EventSessionWithFees[]
	fees: EventFee[]
}) {
	const feeName = (id: number) => fees.find((f) => f.id === id)?.feeType?.name ?? `Fee ${id}`
	const nextOrder = Math.max(0, ...sessions.map((s) => s.displayOrder)) + 1

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<p className="text-sm text-muted-foreground">
					Players register for a session instead of choosing a slot. A session can charge its own
					amount for any event fee. A session with registrations cannot be deleted.
				</p>
				<SessionDialog
					eventId={eventId}
					fees={fees}
					nextOrder={nextOrder}
					trigger={<Button size="sm">Add session</Button>}
				/>
			</div>
			{sessions.length === 0 ? (
				<p className="py-4 text-center text-muted-foreground">No sessions yet.</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Session</TableHead>
							<TableHead className="text-right">Limit</TableHead>
							<TableHead className="text-right">Order</TableHead>
							<TableHead>Fee overrides</TableHead>
							<TableHead className="sr-only">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sessions.map((session) => (
							<TableRow key={session.id}>
								<TableCell>{session.name}</TableCell>
								<TableCell className="text-right">{session.registrationLimit}</TableCell>
								<TableCell className="text-right">{session.displayOrder}</TableCell>
								<TableCell>
									{session.feeOverrides.length === 0
										? "—"
										: session.feeOverrides
												.map((o) => `${feeName(o.eventFeeId)} ${money(o.amount)}`)
												.join(", ")}
								</TableCell>
								<TableCell className="space-x-2 text-right whitespace-nowrap">
									<SessionDialog
										eventId={eventId}
										fees={fees}
										session={session}
										nextOrder={nextOrder}
										trigger={
											<Button size="sm" variant="outline">
												Edit
											</Button>
										}
									/>
									<DeleteSessionDialog eventId={eventId} session={session} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}

function SessionDialog({
	eventId,
	fees,
	session,
	nextOrder,
	trigger,
}: {
	eventId: number
	fees: EventFee[]
	session?: EventSessionWithFees
	nextOrder: number
	trigger: React.ReactNode
}) {
	const [open, setOpen] = useState(false)
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{session ? `Edit ${session.name}` : "Add session"}</DialogTitle>
				</DialogHeader>
				<SessionForm
					eventId={eventId}
					fees={fees}
					session={session}
					nextOrder={nextOrder}
					onSaved={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	)
}

function SessionForm({
	eventId,
	fees,
	session,
	nextOrder,
	onSaved,
}: {
	eventId: number
	fees: EventFee[]
	session?: EventSessionWithFees
	nextOrder: number
	onSaved: () => void
}) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState<SessionField>, formData: FormData) => {
			const result = await saveSession(eventId, session?.id ?? null, prev, formData)
			if (result.status === "success") {
				toast.success(result.message)
				onSaved()
			}
			return result
		},
		{ status: "idle" },
	)
	const errors = state.fieldErrors ?? {}
	const override = (feeId: number) =>
		session?.feeOverrides.find((o) => o.eventFeeId === feeId)?.amount ?? ""

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
			<fieldset disabled={isPending} className="space-y-4">
				<Field data-invalid={!!errors.name}>
					<FieldLabel htmlFor="session-name">Name</FieldLabel>
					<Input
						id="session-name"
						name="name"
						maxLength={60}
						defaultValue={session?.name ?? ""}
						aria-invalid={!!errors.name}
					/>
					<FieldError>{errors.name}</FieldError>
				</Field>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field data-invalid={!!errors.registrationLimit}>
						<FieldLabel htmlFor="registrationLimit">Registration limit</FieldLabel>
						<Input
							id="registrationLimit"
							name="registrationLimit"
							type="number"
							inputMode="numeric"
							min={1}
							step={1}
							defaultValue={session?.registrationLimit ?? ""}
							aria-invalid={!!errors.registrationLimit}
						/>
						<FieldError>{errors.registrationLimit}</FieldError>
					</Field>
					<Field data-invalid={!!errors.displayOrder}>
						<FieldLabel htmlFor="displayOrder">Display order</FieldLabel>
						<Input
							id="displayOrder"
							name="displayOrder"
							type="number"
							inputMode="numeric"
							min={1}
							step={1}
							defaultValue={session?.displayOrder ?? nextOrder}
							aria-invalid={!!errors.displayOrder}
						/>
						<FieldError>{errors.displayOrder}</FieldError>
					</Field>
				</div>
				{fees.length > 0 && (
					<Field data-invalid={!!errors.feeOverrides}>
						<FieldLabel>Fee overrides</FieldLabel>
						<FieldDescription>Leave blank to charge the event fee.</FieldDescription>
						<div className="space-y-2">
							{fees.map((fee) => (
								<div key={fee.id} className="flex items-center gap-3">
									<label htmlFor={`override-${fee.id}`} className="flex-1 text-sm">
										{fee.feeType?.name}{" "}
										<span className="text-muted-foreground">({money(fee.amount)})</span>
									</label>
									<Input
										id={`override-${fee.id}`}
										name={`override-${fee.id}`}
										type="number"
										inputMode="decimal"
										min={0}
										step={0.01}
										defaultValue={override(fee.id)}
										className="w-28"
									/>
								</div>
							))}
						</div>
						<FieldError>{errors.feeOverrides}</FieldError>
					</Field>
				)}
			</fieldset>
			<DialogFooter>
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving..." : "Save"}
				</Button>
			</DialogFooter>
		</form>
	)
}

function DeleteSessionDialog({
	eventId,
	session,
}: {
	eventId: number
	session: EventSessionWithFees
}) {
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
					<DialogTitle>Delete {session.name}?</DialogTitle>
					<DialogDescription>Its fee overrides are deleted with it.</DialogDescription>
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
								const result = await deleteSession(eventId, session.id)
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
