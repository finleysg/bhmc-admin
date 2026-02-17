"use client"

import { useEffect, useState } from "react"

interface RegistrationCountdownProps {
	expires: string
	onExpired: () => void
}

export function RegistrationCountdown({ expires, onExpired }: RegistrationCountdownProps) {
	const [remaining, setRemaining] = useState(() => {
		const diff = new Date(expires).getTime() - Date.now()
		return Math.max(0, Math.floor(diff / 1000))
	})

	useEffect(() => {
		const interval = setInterval(() => {
			const diff = new Date(expires).getTime() - Date.now()
			const secs = Math.max(0, Math.floor(diff / 1000))
			setRemaining(secs)
			if (secs <= 0) {
				clearInterval(interval)
			}
		}, 1000)
		return () => clearInterval(interval)
	}, [expires])

	useEffect(() => {
		if (remaining <= 0) {
			onExpired()
		}
	}, [remaining, onExpired])

	const minutes = Math.floor(remaining / 60)
	const seconds = remaining % 60

	return (
		<p className="text-sm">
			Time remaining to complete registration:{" "}
			<span className={`font-bold ${minutes > 0 ? "" : "text-destructive"}`}>
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
		</p>
	)
}
