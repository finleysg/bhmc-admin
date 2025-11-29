"use client"

import { useEffect, useState } from "react"

export interface AdminRegistrationOptionsState {
	expires: number
	sendPaymentRequest: boolean
	notes: string
}

interface AdminRegistrationOptionsProps {
	onChange: (options: AdminRegistrationOptionsState) => void
}

export function AdminRegistrationOptions({ onChange }: AdminRegistrationOptionsProps) {
	const [expires, setExpires] = useState(24)
	const [sendPaymentRequest, setSendPaymentRequest] = useState(true)
	const [notes, setNotes] = useState("")

	useEffect(() => {
		onChange({
			expires,
			sendPaymentRequest,
			notes,
		})
	}, [expires, sendPaymentRequest, notes, onChange])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="form-control w-full mb-2">
					<label className="label cursor-pointer">
						<span className="label-text mb-1 me-2">Send Payment Request</span>
						<input
							type="checkbox"
							className="toggle toggle-primary"
							checked={sendPaymentRequest}
							onChange={(e) => setSendPaymentRequest(e.target.checked)}
						/>
					</label>
				</div>
				<div className="form-control w-full mb-2">
					<label className="label mb-1 me-2">
						<span className="label-text">Request Expires (hours)</span>
					</label>
					<input
						type="number"
						className="input input-bordered w-full"
						value={expires}
						onChange={(e) => setExpires(Number(e.target.value))}
						min={1}
						disabled={!sendPaymentRequest}
					/>
				</div>
			</div>

			<div className="form-control w-full">
				<label className="label">
					<span className="label-text">Notes</span>
				</label>
				<textarea
					className="textarea textarea-bordered h-24"
					placeholder="Optional notes for this registration"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				></textarea>
			</div>
		</div>
	)
}
