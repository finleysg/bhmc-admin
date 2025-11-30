"use client"

import { useState } from "react"

interface ReserveSpotProps {
	disabled: boolean
	eventId: string
	selectedSlotIds: number[]
	onReserved: (registrationId: number) => void
	onError?: (error: unknown) => void
}

export function ReserveSpot({
	eventId,
	selectedSlotIds,
	onReserved,
	disabled,
	onError,
}: ReserveSpotProps) {
	const [isReserving, setIsReserving] = useState(false)

	const handleReserveSlots = async () => {
		if (selectedSlotIds.length === 0) return

		setIsReserving(true)

		try {
			const response = await fetch(`/api/registration/${eventId}/reserve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(selectedSlotIds),
			})

			if (response.ok) {
				const registrationId = (await response.json()) as number
				onReserved(registrationId)
			} else {
				onError?.(`Reserve returned status ${response.status}`)
			}
		} catch (err) {
			onError?.(err)
		} finally {
			setIsReserving(false)
		}
	}

	return (
		<button
			type="button"
			className="btn btn-secondary"
			onClick={() => void handleReserveSlots()}
			disabled={isReserving || disabled}
		>
			{isReserving ? (
				<>
					<span className="loading loading-spinner loading-sm"></span>
					Reserving...
				</>
			) : (
				"Reserve Now"
			)}
		</button>
	)
}
