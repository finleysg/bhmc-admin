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
	const confirmLabel = mode === "new" ? "Cancel Registration" : "Discard Changes"

	const handleConfirm = () => {
		if (onCanceled) {
			onCanceled()
		}
		void cancelRegistration("user", mode)
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
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
