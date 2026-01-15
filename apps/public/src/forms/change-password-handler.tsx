import { useForm } from "react-hook-form"
import { toast } from "react-toastify"

import { zodResolver } from "@hookform/resolvers/zod"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { ChangePasswordData, ChangePasswordSchema } from "../models/auth"
import { ChangePasswordView } from "./change-password-view"

interface ChangePasswordHandlerProps {
	onClose: () => void
}

export function ChangePasswordHandler({ onClose }: ChangePasswordHandlerProps) {
	const {
		changePassword: { mutate, error },
	} = useAuth()
	const form = useForm<ChangePasswordData>({
		resolver: zodResolver(ChangePasswordSchema),
	})

	const submitHandler = (args: ChangePasswordData) => {
		mutate(args, {
			onSuccess: () => {
				toast.success("👍 Your password has been changed")
				onClose()
			},
		})
	}

	return (
		<div>
			<ChangePasswordView form={form} onSubmit={submitHandler} onCancel={onClose} />
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
