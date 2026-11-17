"use client"

import { startTransition, useActionState } from "react"

import { getEventTypeName, parseLocalDate } from "@repo/domain/functions"
import { EventStatusChoices, type RollForwardPreview } from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Input } from "@/components/shadcn/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"

import { rollForward, type RollForwardState } from "../actions"

function formatDate(date: string) {
	return parseLocalDate(date).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})
}

/**
 * The preview grid: every source event with its proposed name and date. Uncheck an
 * event to leave it out. Nothing is created unless every checked event can be.
 */
export function RollForwardForm({ preview }: { preview: RollForwardPreview }) {
	const { fromSeason, toSeason, events } = preview
	const [state, formAction, isPending] = useActionState(
		(prev: RollForwardState, formData: FormData) =>
			rollForward(fromSeason, toSeason, prev, formData),
		{ status: "idle" },
	)

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
			<fieldset disabled={isPending}>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10">
								<span className="sr-only">Include</span>
							</TableHead>
							<TableHead>{fromSeason} event</TableHead>
							<TableHead>Name in {toSeason}</TableHead>
							<TableHead>Date in {toSeason}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{events.map((e) => {
							const issues = state.issues?.[e.sourceEventId] ?? e.issues
							const id = e.sourceEventId
							return (
								<TableRow key={id} className="align-top">
									<TableCell>
										<Checkbox
											name="include"
											value={String(id)}
											defaultChecked
											aria-label={`Include ${e.sourceName} on ${formatDate(e.sourceStartDate)}`}
										/>
									</TableCell>
									<TableCell>
										<div className="font-medium">{e.sourceName}</div>
										<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
											{formatDate(e.sourceStartDate)} · {getEventTypeName(e.eventType)}
											{e.sourceStatus === EventStatusChoices.CANCELED && (
												<Badge variant="outline">Canceled</Badge>
											)}
											{e.createsSlots && <Badge variant="secondary">Slots</Badge>}
										</div>
									</TableCell>
									<TableCell>
										<Input
											name={`name-${id}`}
											defaultValue={e.name}
											maxLength={100}
											aria-label={`Name in ${toSeason}`}
											aria-invalid={issues.length > 0}
										/>
										{issues.length > 0 && (
											<ul className="mt-1 space-y-0.5 text-sm text-destructive">
												{issues.map((issue) => (
													<li key={issue}>{issue}</li>
												))}
											</ul>
										)}
									</TableCell>
									<TableCell>
										<Input
											type="date"
											name={`date-${id}`}
											defaultValue={e.startDate}
											aria-label={`Date in ${toSeason}`}
											className="w-40"
										/>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</fieldset>
			<div className="flex justify-end">
				<Button type="submit" disabled={isPending}>
					{isPending ? "Creating events..." : `Create events in ${toSeason}`}
				</Button>
			</div>
		</form>
	)
}
