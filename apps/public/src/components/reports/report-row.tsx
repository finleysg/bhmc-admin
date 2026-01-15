import { PropsWithChildren, useState } from "react"

import { MdExpandLess, MdExpandMore } from "react-icons/md"

interface ReportRowProps {
	row: string[]
	rx: number
}

export function ReportRow({ children, row, rx }: PropsWithChildren<ReportRowProps>) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<>
			<tr>
				{row.map((cell, cx) => {
					return (
						<td key={`${cell}-${cx}`} className="report-cell">
							{cell}
						</td>
					)
				})}
				{children && (
					<td>
						<button
							className="btn btn-link"
							onClick={() => setIsOpen(!isOpen)}
							aria-expanded={isOpen}
							aria-controls={`report-row-${rx}`}
						>
							{isOpen ? <MdExpandLess /> : <MdExpandMore />}
						</button>
					</td>
				)}
			</tr>
			{children && isOpen && (
				<tr>
					<td colSpan={row.length + 1}>
						<div id={`report-row-detail-${rx}`}>{children}</div>
					</td>
				</tr>
			)}
		</>
	)
}
