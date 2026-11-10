"use client"

import { useEffect, useState } from "react"
import { CaseSensitive } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	applyTextSize,
	parseTextSize,
	TEXT_SIZE_KEY,
	TEXT_SIZES,
	type TextSize,
} from "@/lib/text-size"

const labels: Record<TextSize, string> = {
	standard: "Standard (100%)",
	larger: "Larger (125%)",
	largest: "Largest (150%)",
}

export function TextSizeControl() {
	const [size, setSize] = useState<TextSize>("standard")

	useEffect(() => {
		let initial = parseTextSize(document.documentElement.dataset.textSize)
		// Next can recover an error response by mounting the layout on the client.
		if (!document.documentElement.dataset.textSize) {
			try {
				initial = parseTextSize(localStorage.getItem(TEXT_SIZE_KEY))
			} catch {
				/* Use Standard. */
			}
			document.documentElement.dataset.textSize = initial
		}
		setSize(initial)
		const synchronize = (event: StorageEvent) => {
			if (event.key !== TEXT_SIZE_KEY && event.key !== null) return
			const next = parseTextSize(event.newValue)
			document.documentElement.dataset.textSize = next
			setSize(next)
		}
		window.addEventListener("storage", synchronize)
		return () => window.removeEventListener("storage", synchronize)
	}, [])

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Text size"
					title="Text size"
					className="text-header-foreground hover:bg-white/10"
				>
					<CaseSensitive className="size-6" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup
					value={size}
					onValueChange={(value) => {
						const next = parseTextSize(value)
						applyTextSize(next)
						setSize(next)
					}}
				>
					{TEXT_SIZES.map((value) => (
						<DropdownMenuRadioItem key={value} value={value}>
							{labels[value]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
