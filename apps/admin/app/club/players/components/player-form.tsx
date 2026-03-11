"use client"

import { useMemo, useState } from "react"

import type { Player, PlayerUpdate } from "@repo/domain/types"

interface PlayerFormProps {
	player: Player
	onSubmit: (data: PlayerUpdate) => void | Promise<void>
	onCancel: () => void
	isSubmitting: boolean
}

export function PlayerForm({ player, onSubmit, onCancel, isSubmitting }: PlayerFormProps) {
	const [firstName, setFirstName] = useState(player.firstName)
	const [lastName, setLastName] = useState(player.lastName)
	const [email, setEmail] = useState(player.email)
	const [phoneNumber, setPhoneNumber] = useState(player.phoneNumber ?? "")
	const [ghin, setGhin] = useState(player.ghin ?? "")
	const [tee, setTee] = useState(player.tee)
	const [birthDate, setBirthDate] = useState(player.birthDate ?? "")
	const [isMember, setIsMember] = useState(player.isMember)
	const [validationError, setValidationError] = useState<string | null>(null)

	const initialValues = useMemo(
		() => ({
			firstName: player.firstName,
			lastName: player.lastName,
			email: player.email,
			phoneNumber: player.phoneNumber ?? "",
			ghin: player.ghin ?? "",
			tee: player.tee,
			birthDate: player.birthDate ?? "",
			isMember: player.isMember,
		}),
		[player],
	)

	const isDirty =
		firstName !== initialValues.firstName ||
		lastName !== initialValues.lastName ||
		email !== initialValues.email ||
		phoneNumber !== initialValues.phoneNumber ||
		ghin !== initialValues.ghin ||
		tee !== initialValues.tee ||
		birthDate !== initialValues.birthDate ||
		isMember !== initialValues.isMember

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		setValidationError(null)

		if (!firstName.trim()) {
			setValidationError("First name is required")
			return
		}
		if (!lastName.trim()) {
			setValidationError("Last name is required")
			return
		}
		if (!email.trim()) {
			setValidationError("Email is required")
			return
		}

		const data: PlayerUpdate = {
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			email: email.trim(),
			phoneNumber: phoneNumber.trim() || null,
			ghin: ghin.trim() || null,
			tee,
			birthDate: birthDate || null,
			isMember,
		}

		void onSubmit(data)
	}

	return (
		<form onSubmit={handleSubmit}>
			{/* Read-only info */}
			<div className="mb-6 rounded-lg bg-base-200 p-4">
				<h3 className="mb-2 text-sm font-semibold text-base-content/70">Account Info</h3>
				<div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
					<div>
						<span className="text-base-content/50">ID:</span> {player.id}
					</div>
					<div>
						<span className="text-base-content/50">Last Season:</span> {player.lastSeason ?? "—"}
					</div>
					<div>
						<span className="text-base-content/50">GG ID:</span> {player.ggId ?? "—"}
					</div>
					<div>
						<span className="text-base-content/50">User ID:</span> {player.userId ?? "—"}
					</div>
					<div>
						<span className="text-base-content/50">Stripe ID:</span>{" "}
						{player.stripeCustomerId ?? "—"}
					</div>
				</div>
			</div>

			{validationError && (
				<div className="alert alert-error mb-4">
					<span>{validationError}</span>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<fieldset className="fieldset">
					<legend className="fieldset-legend">
						First Name <span className="text-error">*</span>
					</legend>
					<input
						type="text"
						className="input input-bordered w-full"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						disabled={isSubmitting}
					/>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">
						Last Name <span className="text-error">*</span>
					</legend>
					<input
						type="text"
						className="input input-bordered w-full"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						disabled={isSubmitting}
					/>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">
						Email <span className="text-error">*</span>
					</legend>
					<input
						type="email"
						className="input input-bordered w-full"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={isSubmitting}
					/>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">Phone Number</legend>
					<input
						type="tel"
						className="input input-bordered w-full"
						value={phoneNumber}
						onChange={(e) => setPhoneNumber(e.target.value)}
						disabled={isSubmitting}
					/>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">GHIN</legend>
					<input
						type="text"
						className="input input-bordered w-full"
						value={ghin}
						maxLength={8}
						onChange={(e) => setGhin(e.target.value)}
						disabled={isSubmitting}
					/>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">Tee</legend>
					<select
						className="select select-bordered w-full"
						value={tee}
						onChange={(e) => setTee(e.target.value)}
						disabled={isSubmitting}
					>
						<option value="Club">Club</option>
						<option value="Gold">Gold</option>
					</select>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">Birth Date</legend>
					<input
						type="date"
						className="input input-bordered w-full"
						value={birthDate}
						onChange={(e) => setBirthDate(e.target.value)}
						disabled={isSubmitting}
					/>
				</fieldset>

				<fieldset className="fieldset">
					<legend className="fieldset-legend">Member</legend>
					<label className="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							className="toggle toggle-primary"
							checked={isMember}
							onChange={(e) => setIsMember(e.target.checked)}
							disabled={isSubmitting}
						/>
						<span className="text-sm">{isMember ? "Active member" : "Not a member"}</span>
					</label>
				</fieldset>
			</div>

			<div className="mt-6 flex justify-end gap-2">
				<button type="button" className="btn" onClick={onCancel} disabled={isSubmitting}>
					Cancel
				</button>
				<button type="submit" className="btn btn-primary" disabled={isSubmitting || !isDirty}>
					{isSubmitting ? (
						<>
							<span className="loading loading-spinner loading-sm"></span>
							Saving...
						</>
					) : (
						"Save"
					)}
				</button>
			</div>
		</form>
	)
}
