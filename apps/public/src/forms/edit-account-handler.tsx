import { useEffect } from "react"

import { useForm } from "react-hook-form"
import { toast } from "react-toastify"

import { zodResolver } from "@hookform/resolvers/zod"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useUpdateMyPlayerRecord } from "../hooks/use-my-player-record"
import { CloseableProps, PlayerProps } from "../models/common-props"
import { PlayerApiData, PlayerApiSchema } from "../models/player"
import { EditAccountView } from "./edit-account-view"

export function EditAccountHandler({ onClose, player }: CloseableProps & PlayerProps) {
	const { mutate, error, reset } = useUpdateMyPlayerRecord()
	const form = useForm<Omit<PlayerApiData, "profile_picture">>({
		resolver: zodResolver(PlayerApiSchema),
		defaultValues: {
			id: player.id,
			is_member: player.isMember,
			first_name: player.firstName,
			last_name: player.lastName,
			email: player.email,
			ghin: player.ghin,
			birth_date: player.birthDay, // ? format(player.birthDate, "yyyy-MM-dd") : "",
			phone_number: player.phoneNumber,
		},
	})

	useEffect(() => {
		// clear any errors on unmount
		return () => reset()
	}, [reset])

	const submitHandler = (args: PlayerApiData) => {
		mutate(args, {
			onSuccess: () => {
				toast.success("👍 Your account changes have been saved.")
				onClose()
			},
			onError: (err) => console.error(err),
		})
	}

	return (
		<div>
			<EditAccountView form={form} onSubmit={submitHandler} onCancel={onClose} />
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
