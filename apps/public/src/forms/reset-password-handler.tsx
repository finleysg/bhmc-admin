import { useForm } from "react-hook-form"
import { useNavigate, useParams } from "react-router-dom"

import { zodResolver } from "@hookform/resolvers/zod"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { ResetPasswordData, ResetPasswordSchema } from "../models/auth"
import { ResetPasswordView } from "./reset-password-view"

export function ResetPasswordHandler() {
	const { uid, token } = useParams()
	const {
		resetPassword: { mutate, error },
	} = useAuth()
	const navigate = useNavigate()
	const form = useForm<ResetPasswordData>({
		resolver: zodResolver(ResetPasswordSchema),
	})

	const submitHandler = (args: ResetPasswordData) => {
		if (uid && token) {
			const finalArgs = { ...args, ...{ uid, token } }
			mutate(finalArgs, {
				onSuccess: () => navigate("/session/reset-password/complete"),
			})
		} else {
			console.error("Inconceivable! Not uid or token params available.")
		}
	}

	return (
		<div>
			<ResetPasswordView form={form} onSubmit={submitHandler} />
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
