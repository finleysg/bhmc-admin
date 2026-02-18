"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { Reservation } from "./page"

type SortField = "sortName" | "signupDate" | "signedUpBy"
type SortDir = "asc" | "desc"

interface RegisteredListProps {
	reservations: Reservation[]
	eventName: string
}

const PAGE_SIZE = 25

export function RegisteredList({ reservations, eventName }: RegisteredListProps) {
	const [search, setSearch] = useState("")
	const [sortField, setSortField] = useState<SortField>("sortName")
	const [sortDir, setSortDir] = useState<SortDir>("asc")
	const [page, setPage] = useState(0)

	const filtered = useMemo(() => {
		if (!search) return reservations
		const q = search.toLowerCase()
		return reservations.filter(
			(r) => r.name.toLowerCase().includes(q) || r.sortName.toLowerCase().includes(q),
		)
	}, [reservations, search])

	const sorted = useMemo(() => {
		const copy = [...filtered]
		copy.sort((a, b) => {
			const aVal = a[sortField]
			const bVal = b[sortField]
			const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
			return sortDir === "asc" ? cmp : -cmp
		})
		return copy
	}, [filtered, sortField, sortDir])

	const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
	const currentPage = Math.min(page, pageCount - 1)
	const paged = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

	function handleSort(field: SortField) {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"))
		} else {
			setSortField(field)
			setSortDir("asc")
		}
		setPage(0)
	}

	function handleSearch(value: string) {
		setSearch(value)
		setPage(0)
	}

	const sortIndicator = (field: SortField) => {
		if (sortField !== field) return null
		return sortDir === "asc" ? " \u25B2" : " \u25BC"
	}

	if (reservations.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg text-primary">{eventName}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">No sign ups yet.</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg text-primary">{eventName}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Input
					type="text"
					placeholder="Search by player name..."
					value={search}
					onChange={(e) => handleSearch(e.target.value)}
				/>

				{/* Desktop table */}
				<div className="hidden sm:block">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									className="cursor-pointer select-none"
									onClick={() => handleSort("sortName")}
								>
									Player{sortIndicator("sortName")}
								</TableHead>
								<TableHead
									className="cursor-pointer select-none"
									onClick={() => handleSort("signupDate")}
								>
									Signup Date{sortIndicator("signupDate")}
								</TableHead>
								<TableHead
									className="cursor-pointer select-none"
									onClick={() => handleSort("signedUpBy")}
								>
									Signed Up By{sortIndicator("signedUpBy")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{paged.map((r) => (
								<TableRow key={r.slotId}>
									<TableCell className="text-secondary font-medium text-sm">{r.sortName}</TableCell>
									<TableCell>
										{format(new Date(r.signupDate), "MM/dd/yyyy h:mm aaaa")}
									</TableCell>
									<TableCell>{r.signedUpBy}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{/* Mobile cards */}
				<div className="sm:hidden">
					{paged.map((r, idx) => (
						<div
							key={r.slotId}
							className={cn(
								"border-b py-2 px-2",
								idx % 2 !== 0 && "bg-muted/30",
							)}
						>
							<div className="font-bold text-secondary text-sm">{r.sortName}</div>
							<div className="text-muted-foreground text-sm">
								{format(new Date(r.signupDate), "MM/dd/yyyy h:mm aaaa")}
							</div>
							<div className="text-muted-foreground text-sm">
								Signed up by: {r.signedUpBy}
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				{pageCount > 1 && (
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex gap-1">
							<button
								className="rounded border px-2 py-1 text-sm disabled:opacity-50"
								onClick={() => setPage(0)}
								disabled={currentPage === 0}
							>
								&laquo;
							</button>
							<button
								className="rounded border px-2 py-1 text-sm disabled:opacity-50"
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={currentPage === 0}
							>
								&lsaquo;
							</button>
							<button
								className="rounded border px-2 py-1 text-sm disabled:opacity-50"
								onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
								disabled={currentPage >= pageCount - 1}
							>
								&rsaquo;
							</button>
							<button
								className="rounded border px-2 py-1 text-sm disabled:opacity-50"
								onClick={() => setPage(pageCount - 1)}
								disabled={currentPage >= pageCount - 1}
							>
								&raquo;
							</button>
						</div>
						<span className="text-muted-foreground text-sm">
							Page {currentPage + 1} of {pageCount}
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
