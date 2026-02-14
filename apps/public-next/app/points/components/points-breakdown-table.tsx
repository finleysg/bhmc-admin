import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"

const POINTS_DATA = [
	{ place: "1", weeknight: 30, major: 60, championship: 75 },
	{ place: "2", weeknight: 25, major: 50, championship: 60 },
	{ place: "3", weeknight: 20, major: 40, championship: 45 },
	{ place: "4", weeknight: 18, major: 36, championship: 38 },
	{ place: "5", weeknight: 17, major: 34, championship: 36 },
	{ place: "6", weeknight: 16, major: 32, championship: 34 },
	{ place: "7", weeknight: 15, major: 30, championship: 32 },
	{ place: "8", weeknight: 14, major: 28, championship: 30 },
	{ place: "9", weeknight: 13, major: 26, championship: 28 },
	{ place: "10", weeknight: 12, major: 24, championship: 26 },
	{ place: "11", weeknight: 11, major: 22, championship: 24 },
	{ place: "12", weeknight: 10, major: 20, championship: 22 },
	{ place: "13", weeknight: 9, major: 18, championship: 20 },
	{ place: "14", weeknight: 8, major: 16, championship: 18 },
	{ place: "15", weeknight: 7, major: 14, championship: 16 },
	{ place: "16", weeknight: 6, major: 12, championship: 14 },
	{ place: "17", weeknight: 5, major: 10, championship: 12 },
	{ place: "18", weeknight: 4, major: 8, championship: 10 },
	{ place: "19", weeknight: 3, major: 6, championship: 8 },
	{ place: "20", weeknight: 2, major: 4, championship: 6 },
	{ place: "others", weeknight: 1, major: 2, championship: 4 },
]

export function PointsBreakdownTable() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Place</TableHead>
					<TableHead className="text-right">Weeknights</TableHead>
					<TableHead className="text-right">Majors</TableHead>
					<TableHead className="text-right">Club Championship</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{POINTS_DATA.map((row) => (
					<TableRow key={row.place}>
						<TableCell>{row.place}</TableCell>
						<TableCell className="text-right">{row.weeknight}</TableCell>
						<TableCell className="text-right">{row.major}</TableCell>
						<TableCell className="text-right">{row.championship}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
