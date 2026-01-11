"use client"

import { useEffect, useState } from "react"

export interface AdminRegistrationOptionsState {
	expires: number
	sendPaymentRequest: boolean
	notes: string
}

interface AdminRegistrationOptionsProps {
	options: AdminRegistrationOptionsState
	onChange: (options: AdminRegistrationOptionsState) => void
}

export function AdminRegistrationOptions({ options, onChange }: AdminRegistrationOptionsProps) {
	const [expiresInput, setExpiresInput] = useState(String(options.expires))

	useEffect(() => {
		setExpiresInput(String(options.expires))
	}, [options.expires])

	const handleExpiresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setExpiresInput(e.target.value)
	}

	const handleExpiresBlur = () => {
		const num = Number(expiresInput) || 0
		onChange({ ...options, expires: num })
	}

	const handleSendPaymentRequestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...options, sendPaymentRequest: e.target.checked })
	}

	const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange({ ...options, notes: e.target.value })
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-x-8 gap-y-4">
				<label className="flex items-center gap-2 cursor-pointer">
					<span className="label-text">Send Payment Request</span>
					<input
						type="checkbox"
						className="toggle toggle-primary"
						checked={options.sendPaymentRequest}
						onChange={handleSendPaymentRequestChange}
					/>
				</label>
				<label className="flex items-center gap-2">
					<span className="label-text">Expires (hours):</span>
					<input
						type="number"
						className="input input-bordered w-24"
						value={expiresInput}
						onChange={handleExpiresChange}
						onBlur={handleExpiresBlur}
						min={1}
						disabled={!options.sendPaymentRequest}
					/>
				</label>
			</div>

			<div className="form-control w-full">
				<label className="label">
					<span className="label-text">Notes</span>
				</label>
				<textarea
					className="textarea textarea-bordered h-24 w-full"
					placeholder="Optional notes for this registration"
					value={options.notes}
					onChange={handleNotesChange}
				></textarea>
			</div>
		</div>
	)
}
