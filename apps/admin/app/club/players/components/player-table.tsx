import Link from "next/link"

import type { Player } from "@repo/domain/types"

import { Badge } from "@/components/shadcn/badge"
import { Card, CardContent } from "@/components/shadcn/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/shadcn/table"

interface PlayerTableProps {
	players: Player[]
}

function MemberBadge({ isMember }: { isMember: boolean }) {
	return isMember ? <Badge>Member</Badge> : <Badge variant="outline">Non-member</Badge>
}

export function PlayerTable({ players }: PlayerTableProps) {
	if (players.length === 0) {
		return <p className="py-8 text-center text-muted-foreground">No players found.</p>
	}

	return (
		<div className="space-y-4">
			{/* Desktop table */}
			<Card className="hidden py-0 md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="pl-6">Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>GHIN</TableHead>
							<TableHead>Tee</TableHead>
							<TableHead className="pr-6">Member</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{players.map((p) => (
							<TableRow key={p.id}>
								<TableCell className="pl-6">
									<Link
										href={`/club/players/${p.id}`}
										className="font-medium text-primary hover:underline"
									>
										{p.firstName} {p.lastName}
									</Link>
								</TableCell>
								<TableCell>{p.email}</TableCell>
								<TableCell>{p.ghin ?? "—"}</TableCell>
								<TableCell>{p.tee}</TableCell>
								<TableCell className="pr-6">
									<MemberBadge isMember={p.isMember} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			{/* Mobile cards */}
			<div className="space-y-3 md:hidden">
				{players.map((p) => (
					<Link key={p.id} href={`/club/players/${p.id}`} className="block">
						<Card className="py-4 transition-colors hover:bg-muted/50">
							<CardContent className="space-y-1 px-4">
								<div className="flex items-start justify-between gap-2">
									<h3 className="font-semibold">
										{p.firstName} {p.lastName}
									</h3>
									<MemberBadge isMember={p.isMember} />
								</div>
								<p className="text-sm text-muted-foreground">{p.email}</p>
								<div className="flex gap-4 text-sm text-muted-foreground">
									{p.ghin && <span>GHIN: {p.ghin}</span>}
									<span>Tee: {p.tee}</span>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			<p className="text-sm text-muted-foreground">
				{players.length} player{players.length !== 1 ? "s" : ""} found
			</p>
		</div>
	)
}
