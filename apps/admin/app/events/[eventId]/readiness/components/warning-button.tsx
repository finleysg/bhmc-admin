"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/shadcn/button"

import { dismissWarning, restoreWarning } from "../actions"

/** Dismisses a warning, or restores a dismissed one. */
export function WarningButton({
	eventId,
	code,
	subject,
	dismissed,
}: {
	eventId: number
	code: string
	subject: string
	dismissed: boolean
}) {
	const [isPending, startTransition] = useTransition()

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={isPending}
			onClick={() =>
				startTransition(async () => {
					const act = dismissed ? restoreWarning : dismissWarning
					const result = await act(eventId, code, subject)
					if (result.status === "success") toast.success(result.message)
					else toast.error(result.message)
				})
			}
		>
			{dismissed
				? isPending
					? "Restoring..."
					: "Restore"
				: isPending
					? "Dismissing..."
					: "Dismiss"}
		</Button>
	)
}
