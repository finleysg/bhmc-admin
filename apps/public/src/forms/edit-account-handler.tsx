import { FormEvent, useEffect, useState } from "react"

import { toast } from "react-toastify"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useUpdateMyPlayerRecord } from "../hooks/use-my-player-record"
import { CloseableProps, PlayerProps } from "../models/common-props"
import { PlayerApiData, PlayerApiSchema } from "../models/player"
import { formatZodErrors } from "../utils/form-utils"
import { EditAccountView } from "./edit-account-view"

type EditAccountData = Omit<PlayerApiData, "profile_picture">

export function EditAccountHandler({ onClose, player }: CloseableProps & PlayerProps) {
	const { mutate, error, reset } = useUpdateMyPlayerRecord()

	const [formData, setFormData] = useState<EditAccountData>({
		id: player.id,
		is_member: player.isMember,
		first_name: player.firstName,
		last_name: player.lastName,
		email: player.email,
		ghin: player.ghin,
		birth_date: player.birthDay,
		phone_number: player.phoneNumber,
	})
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		return () => reset()
	}, [reset])

	const handleChange = (field: keyof EditAccountData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = PlayerApiSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		mutate(result.data, {
			onSuccess: () => {
				toast.success("👍 Your account changes have been saved.")
				onClose()
			},
			onError: (err) => console.error(err),
			onSettled: () => setIsSubmitting(false),
		})
	}

	return (
		<div>
			<EditAccountView
				formData={formData}
				errors={errors}
				isSubmitting={isSubmitting}
				onChange={handleChange}
				onSubmit={handleSubmit}
				onCancel={onClose}
			/>
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
