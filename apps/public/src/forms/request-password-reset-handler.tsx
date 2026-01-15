import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { zodResolver } from "@hookform/resolvers/zod"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { RequestPasswordData, RequestPasswordSchema } from "../models/auth"
import { RequestPasswordResetView } from "./request-password-reset-view"

export function RequestPasswordResetHandler() {
	const {
		requestPasswordReset: { mutate, error },
	} = useAuth()
	const navigate = useNavigate()
	const form = useForm<RequestPasswordData>({
		resolver: zodResolver(RequestPasswordSchema),
	})

	const submitHandler = (args: RequestPasswordData) => {
		mutate(args, {
			onSuccess: () => navigate("/session/reset-password/sent"),
		})
	}

	return (
		<div>
			<RequestPasswordResetView form={form} onSubmit={submitHandler} />
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
