"use client"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useRegistration } from "@/lib/registration/registration-context"
import type { RegistrationMode } from "@/lib/registration/types"

interface CancelButtonProps {
	mode: RegistrationMode
	onCanceled?: () => void
}

export function CancelButton({ mode, onCanceled }: CancelButtonProps) {
	const { cancelRegistration } = useRegistration()

	const title = mode === "new" ? "Cancel Registration?" : "Cancel Changes?"
	const description =
		mode === "new"
			? "This will release your reserved spots and return to the event detail page."
			: "This will discard your changes and return to the event detail page."

	const handleConfirm = () => {
		// Wait for the cancel result before navigating. If the API refuses
		// (409: payment in flight), the registration must be preserved and we
		// stay on the current page so the user sees the toast and the webhook
		// can complete.
		void cancelRegistration("user", mode).then((cancelled) => {
			if (!cancelled) return
			if (onCanceled) {
				onCanceled()
			}
		})
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline">Cancel</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Go Back</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={handleConfirm}>
						Confirm
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
