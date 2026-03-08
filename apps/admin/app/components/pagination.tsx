import { Table } from "@tanstack/react-table"

interface PaginationProps<T> {
	table: Table<T>
}

export function Pagination<T>({ table }: PaginationProps<T>) {
	return (
		<div className="flex items-center justify-between mt-4">
			<div className="flex items-center gap-2">
				<span className="text-xs text-nowrap">
					Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
				</span>
				<select
					value={table.getState().pagination.pageSize}
					onChange={(e) => table.setPageSize(Number(e.target.value))}
					className="select select-bordered select-sm"
				>
					{[25, 50, 100, 500].map((size) => (
						<option key={size} value={size}>
							{size} rows
						</option>
					))}
				</select>
			</div>
			<div className="flex items-center gap-2">
				<button
					className="btn btn-sm"
					onClick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
				>
					{"<<"}
				</button>
				<button
					className="btn btn-sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					{"<"}
				</button>
				<button
					className="btn btn-sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					{">"}
				</button>
				<button
					className="btn btn-sm"
					onClick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
				>
					{">>"}
				</button>
			</div>
		</div>
	)
}
