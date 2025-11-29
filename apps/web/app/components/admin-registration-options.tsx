"use client"

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
	const handleExpiresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...options, expires: Number(e.target.value) })
	}

	const handleSendPaymentRequestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange({ ...options, sendPaymentRequest: e.target.checked })
	}

	const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange({ ...options, notes: e.target.value })
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="form-control w-full mb-2">
					<label className="label cursor-pointer">
						<span className="label-text mb-1 me-2">Send Payment Request</span>
						<input
							type="checkbox"
							className="toggle toggle-primary"
							checked={options.sendPaymentRequest}
							onChange={handleSendPaymentRequestChange}
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
						value={options.expires}
						onChange={handleExpiresChange}
						min={1}
						disabled={!options.sendPaymentRequest}
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
					value={options.notes}
					onChange={handleNotesChange}
				></textarea>
			</div>
		</div>
	)
}
