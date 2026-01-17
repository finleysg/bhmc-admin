import { FormEvent, useEffect, useState } from "react"

import { DuplicateEmail } from "../components/feedback/duplicate-email"
import { ErrorDisplay } from "../components/feedback/error-display"
import { usePlayerCreate } from "../hooks/use-players"
import { GuestPlayerApiSchema, GuestPlayerData, Player, PlayerApiSchema } from "../models/player"
import { formatZodErrors } from "../utils/form-utils"
import { AddPlayerView } from "./add-player-view"

interface AddPlayerHandlerProps {
	onCancel: () => void
	onCreated: (player: Player) => void
}

const defaultFormData: GuestPlayerData = {
	first_name: "",
	last_name: "",
	email: "",
	ghin: "",
}

export function AddPlayerHandler({ onCancel, onCreated }: AddPlayerHandlerProps) {
	const { mutate, isError, error, reset } = usePlayerCreate()

	const [formData, setFormData] = useState<GuestPlayerData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		return () => reset()
	}, [reset])

	const isDuplicate = isError && (error?.message?.indexOf("user already exists") ?? -1) >= 0

	const handleChange = (field: keyof GuestPlayerData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = GuestPlayerApiSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		mutate(result.data, {
			onSuccess: (data) => {
				const playerData = PlayerApiSchema.parse(data)
				onCreated(new Player(playerData))
			},
			onSettled: () => setIsSubmitting(false),
		})
	}

	const handleCancel = () => {
		reset()
		onCancel()
	}

	return (
		<div style={{ width: "240px" }}>
			<AddPlayerView
				formData={formData}
				errors={errors}
				isSubmitting={isSubmitting}
				onChange={handleChange}
				onSubmit={handleSubmit}
				onCancel={handleCancel}
			/>
			{isDuplicate && <DuplicateEmail />}
			{!isDuplicate && isError && <ErrorDisplay error={error?.message ?? ""} />}
		</div>
	)
}
