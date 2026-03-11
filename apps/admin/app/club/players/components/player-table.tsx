"use client"

import Link from "next/link"

import type { Player } from "@repo/domain/types"

interface PlayerTableProps {
	players: Player[]
}

export function PlayerTable({ players }: PlayerTableProps) {
	if (players.length === 0) {
		return <p className="text-center text-base-content/70 py-8">No players found.</p>
	}

	return (
		<div>
			{/* Desktop table */}
			<div className="hidden overflow-x-auto md:block">
				<table className="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>GHIN</th>
							<th>Tee</th>
							<th>Member</th>
						</tr>
					</thead>
					<tbody>
						{players.map((p) => (
							<tr key={p.id} className="hover">
								<td>
									<Link href={`/club/players/${p.id}`} className="link link-hover">
										{p.firstName} {p.lastName}
									</Link>
								</td>
								<td>{p.email}</td>
								<td>{p.ghin ?? "—"}</td>
								<td>{p.tee}</td>
								<td>
									{p.isMember ? (
										<span className="badge badge-sm badge-success">Member</span>
									) : (
										<span className="badge badge-sm badge-ghost">Non-member</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile cards */}
			<div className="space-y-3 md:hidden">
				{players.map((p) => (
					<Link
						key={p.id}
						href={`/club/players/${p.id}`}
						className="card bg-base-100 shadow-xs block"
					>
						<div className="card-body p-4">
							<div className="flex items-start justify-between">
								<h3 className="font-semibold">
									{p.firstName} {p.lastName}
								</h3>
								{p.isMember ? (
									<span className="badge badge-sm badge-success">Member</span>
								) : (
									<span className="badge badge-sm badge-ghost">Non-member</span>
								)}
							</div>
							<p className="text-sm text-base-content/70">{p.email}</p>
							<div className="flex gap-4 text-sm text-base-content/70">
								{p.ghin && <span>GHIN: {p.ghin}</span>}
								<span>Tee: {p.tee}</span>
							</div>
						</div>
					</Link>
				))}
			</div>

			<p className="mt-4 text-sm text-base-content/70">
				{players.length} player{players.length !== 1 ? "s" : ""} found
			</p>
		</div>
	)
}
