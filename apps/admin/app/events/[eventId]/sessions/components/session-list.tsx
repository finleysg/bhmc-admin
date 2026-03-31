"use client"

import type { EventFee, EventSessionWithFees } from "@repo/domain/types"
import { Card, CardBody } from "@/components/ui/card"

interface SessionListProps {
	sessions: EventSessionWithFees[]
	eventFees: EventFee[]
	onEdit: (session: EventSessionWithFees) => void
	onDelete: (session: EventSessionWithFees) => void
}

function getFeeLabel(eventFeeId: number, eventFees: EventFee[]): string {
	const fee = eventFees.find((f) => f.id === eventFeeId)
	return fee?.feeType?.name ?? `Fee #${eventFeeId}`
}

export function SessionList({ sessions, eventFees, onEdit, onDelete }: SessionListProps) {
	if (sessions.length === 0) {
		return (
			<Card shadow="xs">
				<CardBody>
					<div className="text-center py-4 text-base-content/60">No sessions configured</div>
				</CardBody>
			</Card>
		)
	}

	const sorted = [...sessions].sort((a, b) => a.displayOrder - b.displayOrder)

	return (
		<Card shadow="xs">
			<CardBody>
				{/* Desktop: table */}
				<div className="hidden md:block overflow-x-auto">
					<table className="table table-zebra">
						<thead>
							<tr>
								<th>Name</th>
								<th>Registration Limit</th>
								<th>Display Order</th>
								<th>Fee Overrides</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((session) => (
								<tr key={session.id}>
									<td>{session.name}</td>
									<td>{session.registrationLimit}</td>
									<td>{session.displayOrder}</td>
									<td>
										{session.feeOverrides.length === 0 ? (
											<span className="text-base-content/60">None</span>
										) : (
											<ul className="list-disc list-inside text-sm">
												{session.feeOverrides.map((fo) => (
													<li key={fo.id}>
														{getFeeLabel(fo.eventFeeId, eventFees)}: ${fo.amount.toFixed(2)}
													</li>
												))}
											</ul>
										)}
									</td>
									<td>
										<div className="flex gap-2">
											<button
												type="button"
												className="btn btn-sm btn-ghost"
												onClick={() => onEdit(session)}
											>
												Edit
											</button>
											<button
												type="button"
												className="btn btn-sm btn-ghost text-error"
												onClick={() => onDelete(session)}
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Mobile: stacked cards */}
				<div className="md:hidden space-y-4">
					{sorted.map((session) => (
						<div key={session.id} className="border-b border-base-300 pb-4 last:border-0">
							<div className="font-semibold">{session.name}</div>
							<div className="text-sm text-base-content/70">
								Limit: {session.registrationLimit} | Order: {session.displayOrder}
							</div>
							{session.feeOverrides.length > 0 && (
								<ul className="list-disc list-inside text-sm mt-1">
									{session.feeOverrides.map((fo) => (
										<li key={fo.id}>
											{getFeeLabel(fo.eventFeeId, eventFees)}: ${fo.amount.toFixed(2)}
										</li>
									))}
								</ul>
							)}
							<div className="flex gap-2 mt-2">
								<button
									type="button"
									className="btn btn-sm btn-ghost"
									onClick={() => onEdit(session)}
								>
									Edit
								</button>
								<button
									type="button"
									className="btn btn-sm btn-ghost text-error"
									onClick={() => onDelete(session)}
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			</CardBody>
		</Card>
	)
}
