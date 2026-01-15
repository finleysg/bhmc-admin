import { useEffect } from "react"

import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { zodResolver } from "@hookform/resolvers/zod"

import { DuplicateEmail } from "../components/feedback/duplicate-email"
import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { RegisterAccountSchema, RegisterData } from "../models/auth"
import { RegisterAccountView } from "./register-account-view"

export function RegisterAccountHandler() {
	const {
		register: { mutate, isError, error, reset },
	} = useAuth()
	const navigate = useNavigate()
	const form = useForm<RegisterData>({
		resolver: zodResolver(RegisterAccountSchema),
	})

	useEffect(() => {
		// clear any errors on unmount
		return () => reset()
	}, [reset])

	const isDuplicate = isError && (error?.message?.indexOf("user already exists") ?? -1) >= 0

	const submitHandler = (args: RegisterData) => {
		mutate(args, {
			onSuccess: () => navigate("/session/account/confirm"),
		})
	}

	return (
		<div>
			<RegisterAccountView form={form} onSubmit={submitHandler} />
			{isDuplicate && <DuplicateEmail />}
			{isError && !isDuplicate && (
				<ErrorDisplay error={error?.message ?? "Registration error"} delay={3000} />
			)}
		</div>
	)
}
