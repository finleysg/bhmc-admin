import { useEffect } from "react"

import { useForm } from "react-hook-form"

import { zodResolver } from "@hookform/resolvers/zod"

import { DuplicateEmail } from "../components/feedback/duplicate-email"
import { ErrorDisplay } from "../components/feedback/error-display"
import { usePlayerCreate } from "../hooks/use-players"
import { GuestPlayerApiSchema, GuestPlayerData, Player, PlayerApiSchema } from "../models/player"
import { AddPlayerView } from "./add-player-view"

interface AddPlayerHandlerProps {
	onCancel: () => void
	onCreated: (player: Player) => void
}

export function AddPlayerHandler({ onCancel, onCreated }: AddPlayerHandlerProps) {
	const { mutate, isError, error, reset } = usePlayerCreate()
	const form = useForm<GuestPlayerData>({
		resolver: zodResolver(GuestPlayerApiSchema),
	})

	useEffect(() => {
		// clear any errors on unmount
		return () => reset()
	}, [reset])

	const isDuplicate = isError && (error?.message?.indexOf("user already exists") ?? -1) >= 0

	const handleSubmit = (args: GuestPlayerData) => {
		mutate(args, {
			onSuccess: (data) => {
				const playerData = PlayerApiSchema.parse(data)
				onCreated(new Player(playerData))
			},
		})
	}

	const handleCancel = () => {
		reset()
		onCancel()
	}

	return (
		<div style={{ width: "240px" }}>
			<AddPlayerView form={form} onSubmit={handleSubmit} onCancel={handleCancel} />
			{isDuplicate && <DuplicateEmail />}
			{!isDuplicate && isError && <ErrorDisplay error={error?.message ?? ""} />}
		</div>
	)
}
