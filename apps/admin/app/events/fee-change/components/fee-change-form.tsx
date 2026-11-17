"use client"

import { startTransition, useActionState, useRef } from "react"
import { toast } from "sonner"

import { getEventTypeName, parseLocalDate } from "@repo/domain/functions"
import {
	EventTypeChoices,
	type FeeType,
	type SeasonFeeChange,
	type SeasonFeeChangeItem,
} from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
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

import { NONE } from "../../event-settings"
import { changeSeasonFee, type FeeChangeState } from "../actions"

const money = (amount: number) => `$${amount.toFixed(2)}`

function formatDate(date: string) {
	return parseLocalDate(date).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})
}

function describe(item: SeasonFeeChangeItem) {
	if (item.kind === "amount") return "Fee"
	if (item.kind === "override") return "Override"
	return `${item.sessionName} session`
}

/** Choose the change, preview the events it covers, then apply exactly that change. */
export function FeeChangeForm({ season, feeTypes }: { season: number; feeTypes: FeeType[] }) {
	const formRef = useRef<HTMLFormElement>(null)
	const [state, formAction, isPending] = useActionState(
		async (prev: FeeChangeState, formData: FormData) => {
			const result = await changeSeasonFee(season, prev, formData)
			if (result.status === "success" && result.message) toast.success(result.message)
			return result
		},
		{ status: "idle" },
	)
	const errors = state.fieldErrors ?? {}

	const submit = (intent: "preview" | "apply") => {
		const formData = new FormData(formRef.current!)
		formData.set("intent", intent)
		startTransition(() => formAction(formData))
	}

	return (
		<div className="space-y-6">
			<form
				ref={formRef}
				// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
				onSubmit={(e) => {
					e.preventDefault()
					submit("preview")
				}}
				className="space-y-4"
				noValidate
			>
				{state.status === "error" && (
					<Alert variant="destructive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}
				<fieldset disabled={isPending} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
					<Field data-invalid={!!errors.feeTypeId} className="sm:col-span-2">
						<FieldLabel htmlFor="feeTypeId">Fee type</FieldLabel>
						<Select name="feeTypeId">
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
					<Field data-invalid={!!errors.eventType} className="sm:col-span-2">
						<FieldLabel htmlFor="eventType">Event type</FieldLabel>
						<Select name="eventType" defaultValue={NONE}>
							<SelectTrigger id="eventType" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE}>Every event type</SelectItem>
								{Object.values(EventTypeChoices).map((type) => (
									<SelectItem key={type} value={type}>
										{getEventTypeName(type)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError>{errors.eventType}</FieldError>
					</Field>
					<Field data-invalid={!!errors.fromAmount}>
						<FieldLabel htmlFor="fromAmount">Old amount</FieldLabel>
						<Input
							id="fromAmount"
							name="fromAmount"
							type="number"
							inputMode="decimal"
							min={0}
							step={0.01}
							aria-invalid={!!errors.fromAmount}
						/>
						<FieldError>{errors.fromAmount}</FieldError>
					</Field>
					<Field data-invalid={!!errors.toAmount}>
						<FieldLabel htmlFor="toAmount">New amount</FieldLabel>
						<Input
							id="toAmount"
							name="toAmount"
							type="number"
							inputMode="decimal"
							min={0}
							step={0.01}
							aria-invalid={!!errors.toAmount}
						/>
						<FieldError>{errors.toAmount}</FieldError>
					</Field>
					<div className="flex items-end sm:col-span-2">
						<Button type="submit" variant="outline" disabled={isPending}>
							Preview
						</Button>
					</div>
				</fieldset>
			</form>
			{state.change && (
				<ChangeReport change={state.change} isPending={isPending} onApply={() => submit("apply")} />
			)}
		</div>
	)
}

function ChangeReport({
	change,
	isPending,
	onApply,
}: {
	change: SeasonFeeChange
	isPending: boolean
	onApply: () => void
}) {
	const changing = change.events.filter((e) => e.refused === null).length
	const refused = change.events.length - changing
	const scope = change.eventType ? ` for ${getEventTypeName(change.eventType)} events` : ""
	const summary = `${change.feeTypeName} ${money(change.fromAmount)} → ${money(change.toAmount)}${scope}`

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<p className="text-sm">
					<span className="font-medium">{summary}</span>
					{": "}
					{change.events.length === 0
						? "no amounts match."
						: `${changing} event${changing === 1 ? "" : "s"} ${change.applied ? "changed" : "will change"}${refused > 0 ? `, ${refused} left unchanged` : ""}.`}
				</p>
				{!change.applied && changing > 0 && (
					<Button onClick={onApply} disabled={isPending}>
						{isPending ? "Applying..." : "Apply change"}
					</Button>
				)}
			</div>
			{change.events.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Event</TableHead>
							<TableHead>Amounts</TableHead>
							<TableHead>Result</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{change.events.map((e) => (
							<TableRow key={e.eventId}>
								<TableCell className="whitespace-nowrap">{formatDate(e.startDate)}</TableCell>
								<TableCell>{e.eventName}</TableCell>
								<TableCell>{e.changes.map(describe).join(", ")}</TableCell>
								<TableCell className={e.refused ? "text-destructive" : undefined}>
									{e.refused ?? (change.applied ? "Changed" : "Will change")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}
