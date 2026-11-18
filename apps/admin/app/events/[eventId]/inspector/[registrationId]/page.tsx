import Link from "next/link"
import { notFound } from "next/navigation"

import { ExternalLink } from "lucide-react"

import type {
	InspectedPayment,
	RegistrationInspection,
	RegistrationStatusValue,
	StripeCheck,
} from "@repo/domain/types"

import { DetailItem, DetailList } from "@/components/detail-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { formatClubDateTime } from "@/lib/club-time"
import { apiGet } from "@/lib/server-api"

import { AddFeeDialog, RemoveFeeDialog, SlotStatusDialog } from "./components/slot-repairs"

const money = (amount: number) => `$${amount.toFixed(2)}`

const STATUS: Record<RegistrationStatusValue, { label: string; held?: boolean }> = {
	A: { label: "Available" },
	P: { label: "Pending", held: true },
	R: { label: "Reserved" },
	X: { label: "Awaiting payment", held: true },
	U: { label: "Unavailable" },
}

function StripeBadge({ check }: { check: StripeCheck }) {
	if (check.result === "not-stripe") return <Badge variant="outline">Not Stripe</Badge>
	if (check.result === "ok") return <Badge variant="secondary">Stripe agrees</Badge>
	return (
		<Badge variant="destructive">{check.result === "error" ? "Stripe error" : "Mismatch"}</Badge>
	)
}

function StripeIssues({ check }: { check: StripeCheck }) {
	if (check.issues.length === 0) return null
	return (
		<ul className="list-disc pl-5 text-sm text-destructive">
			{check.issues.map((issue) => (
				<li key={issue}>{issue}</li>
			))}
		</ul>
	)
}

const problems = (payments: InspectedPayment[]) =>
	payments
		.flatMap((p) => [p.stripe, ...p.refunds.map((r) => r.stripe)])
		.filter((c) => c.result === "mismatch" || c.result === "error").length

/** Registration Inspector: one registration, everything needed to diagnose it, and repairs. */
export default async function InspectRegistrationPage({
	params,
}: {
	params: Promise<{ eventId: string; registrationId: string }>
}) {
	const { eventId: eventParam, registrationId: registrationParam } = await params
	const eventId = Number(eventParam)
	const registrationId = Number(registrationParam)
	if (!Number.isInteger(eventId) || !Number.isInteger(registrationId)) notFound()
	const r = await apiGet<RegistrationInspection>(
		`/registration-inspector/events/${eventId}/registrations/${registrationId}`,
	)
	const ids = { registrationId: r.id, eventId: r.eventId }
	const stripePayments = new Set(
		r.payments.filter((p) => p.paymentCode.startsWith("pi_")).map((p) => p.id),
	)
	const stripeProblems = problems(r.payments)
	// Expiry cleanup deletes every payment of a registration still being paid for.
	const beingPaidFor = r.slots.some((s) => STATUS[s.status]?.held)

	return (
		<div className="mx-auto max-w-5xl space-y-6 md:py-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h3 className="font-heading text-2xl font-bold">Registration {r.id}</h3>
				<Button asChild variant="outline">
					<Link href={`/events/${eventId}/inspector`}>Back to registrations</Link>
				</Button>
			</div>

			{(r.holdExpired || stripeProblems > 0) && (
				<Alert variant="destructive">
					<AlertTitle>Needs attention</AlertTitle>
					<AlertDescription>
						<ul className="list-disc pl-5">
							{r.holdExpired && (
								<li>The pending hold expired, but a slot is still Pending or Awaiting payment.</li>
							)}
							{stripeProblems > 0 && (
								<li>
									Stripe disagrees with the database on {stripeProblems} payment
									{stripeProblems === 1 ? "" : "s"} or refund{stripeProblems === 1 ? "" : "s"}.
								</li>
							)}
						</ul>
					</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Registration</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<DetailList className="grid-cols-1 sm:grid-cols-3">
						<DetailItem label="Signed up by" value={r.signedUpBy} />
						<DetailItem label="Created" value={formatClubDateTime(r.createdDate)} />
						<DetailItem label="User" value={r.userId} />
						<DetailItem label="Course" value={r.courseName} />
						<DetailItem
							label="Hold expires"
							value={
								r.expires && (
									<span className={r.holdExpired ? "text-destructive" : undefined}>
										{formatClubDateTime(r.expires)}
										{r.holdExpired && " (expired)"}
									</span>
								)
							}
						/>
					</DetailList>
					{r.notes && <p className="text-sm whitespace-pre-wrap">{r.notes}</p>}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Slots and fees</CardTitle>
					<CardDescription>
						Status and fee changes are recorded in the audit history.
						{!r.canChoose &&
							" Players don't choose slots for this event, so a slot can't be made Available or Unavailable here; drop the player in Player Management."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{r.slots.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No slots belong to this registration. Check the payments below for fees left by a
							drop.
						</p>
					) : (
						<ul className="divide-y">
							{r.slots.map((slot) => (
								<li key={slot.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div>
											<div className="font-medium">{slot.playerName ?? <em>Empty</em>}</div>
											<div className="text-xs text-muted-foreground">
												{slot.sessionName ??
													(slot.holeNumber !== null
														? `Hole ${slot.holeNumber}, group ${slot.startingOrder + 1}`
														: "No start")}{" "}
												· Slot {slot.id}
											</div>
										</div>
										<Badge variant={STATUS[slot.status]?.held ? "destructive" : "outline"}>
											{STATUS[slot.status]?.label ?? slot.status}
										</Badge>
									</div>
									{slot.fees.length === 0 ? (
										<p className="text-sm text-muted-foreground">No fees</p>
									) : (
										<ul className="space-y-2">
											{slot.fees.map((fee) => (
												<li
													key={fee.id}
													className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
												>
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<span>
																{fee.feeTypeName} {money(fee.amount)}
															</span>
															<Badge variant={fee.isPaid ? "secondary" : "outline"}>
																{fee.isPaid ? "Paid" : "Unpaid"}
															</Badge>
														</div>
														<div className="text-xs text-muted-foreground">
															Payment {fee.paymentId}
														</div>
													</div>
													<RemoveFeeDialog
														ids={ids}
														fee={fee}
														stripePaid={fee.isPaid && stripePayments.has(fee.paymentId)}
													/>
												</li>
											))}
										</ul>
									)}
									<div className="flex flex-wrap gap-2">
										<SlotStatusDialog ids={ids} slot={slot} canChoose={r.canChoose} />
										{slot.status === "R" && !beingPaidFor && (
											<AddFeeDialog ids={ids} slot={slot} eventFees={r.eventFees} />
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Payments and refunds</CardTitle>
					<CardDescription>
						Checked live against Stripe. Includes any other payment by the registering user for this
						event.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{r.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments</p>}
					{r.payments.map((p) => (
						<div key={p.id} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-medium">Payment {p.id}</span>
								<StripeBadge check={p.stripe} />
								{!p.confirmed && <Badge variant="outline">Not confirmed</Badge>}
							</div>
							<DetailList className="grid-cols-1 sm:grid-cols-3">
								<DetailItem
									label="Code"
									value={
										p.stripeUrl ? (
											<a
												href={p.stripeUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-primary hover:underline"
												title="Open in the Stripe dashboard"
											>
												<code className="break-all">{p.paymentCode}</code>
												<ExternalLink className="size-3 shrink-0" />
											</a>
										) : (
											<code className="break-all">{p.paymentCode}</code>
										)
									}
								/>
								<DetailItem
									label="Amount"
									value={`${money(p.amount)} + ${money(p.transactionFee)} fee`}
								/>
								<DetailItem
									label="Stripe"
									value={
										p.stripe.stripeStatus &&
										`${p.stripe.stripeStatus}, ${money(p.stripe.stripeAmount ?? 0)}`
									}
								/>
								<DetailItem label="Paid" value={formatClubDateTime(p.paymentDate)} />
								<DetailItem label="Confirmed" value={formatClubDateTime(p.confirmDate)} />
							</DetailList>
							<StripeIssues check={p.stripe} />
							{p.refunds.map((refund) => (
								<div key={refund.id} className="ml-4 space-y-1 border-l pl-4">
									<div className="flex flex-wrap items-center gap-2 text-sm">
										<span className="font-medium">Refund {refund.id}</span>
										<StripeBadge check={refund.stripe} />
										{!refund.confirmed && <Badge variant="outline">Not confirmed</Badge>}
									</div>
									<DetailList className="grid-cols-1 sm:grid-cols-3">
										<DetailItem
											label="Code"
											value={<code className="break-all">{refund.refundCode}</code>}
										/>
										<DetailItem label="Amount" value={money(refund.amount)} />
										<DetailItem label="Date" value={formatClubDateTime(refund.refundDate)} />
									</DetailList>
									{refund.notes && <p className="text-sm">{refund.notes}</p>}
									<StripeIssues check={refund.stripe} />
								</div>
							))}
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Change log</CardTitle>
				</CardHeader>
				<CardContent>
					{r.changeLog.length === 0 ? (
						<p className="text-sm text-muted-foreground">No changes recorded</p>
					) : (
						<ul className="divide-y">
							{r.changeLog.map((c) => (
								<li key={c.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
									<div className="flex flex-wrap items-baseline justify-between gap-x-4">
										<span className="font-medium">{c.action}</span>
										<span className="text-xs text-muted-foreground">
											{formatClubDateTime(c.createdDate)}
										</span>
									</div>
									<div className="text-muted-foreground">
										{c.actorName}
										{c.isAdmin && " (admin)"}
									</div>
									<code className="block text-xs break-all">{JSON.stringify(c.details)}</code>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
