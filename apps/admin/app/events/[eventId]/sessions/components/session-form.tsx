"use client"

import { useState } from "react"
import type { EventFee, EventSessionWithFees } from "@repo/domain/types"
import { FormField } from "@/app/components/ui/form-field"

export interface SessionFormData {
	name: string
	registrationLimit: number
	displayOrder: number
	feeOverrides: { eventFeeId: number; amount: number }[]
}

interface SessionFormProps {
	onSubmit: (data: SessionFormData) => void | Promise<void>
	onCancel: () => void
	initialData?: EventSessionWithFees
	eventFees: EventFee[]
	isSubmitting: boolean
}

export function SessionForm({
	onSubmit,
	onCancel,
	initialData,
	eventFees,
	isSubmitting,
}: SessionFormProps) {
	const [name, setName] = useState(initialData?.name ?? "")
	const [registrationLimit, setRegistrationLimit] = useState(
		initialData?.registrationLimit?.toString() ?? "",
	)
	const [displayOrder, setDisplayOrder] = useState(initialData?.displayOrder?.toString() ?? "1")
	const [feeOverrides, setFeeOverrides] = useState<{ eventFeeId: number; amount: string }[]>(
		initialData?.feeOverrides.map((fo) => ({
			eventFeeId: fo.eventFeeId,
			amount: fo.amount.toString(),
		})) ?? [],
	)
	const [errors, setErrors] = useState<{
		name?: string
		registrationLimit?: string
		displayOrder?: string
	}>({})

	const isEditMode = !!initialData

	const validate = (): boolean => {
		const newErrors: { name?: string; registrationLimit?: string; displayOrder?: string } = {}

		if (!name.trim()) {
			newErrors.name = "Name is required"
		}

		const limitNum = Number(registrationLimit)
		if (!registrationLimit || isNaN(limitNum) || limitNum < 1) {
			newErrors.registrationLimit = "Registration limit must be at least 1"
		}

		const orderNum = Number(displayOrder)
		if (!displayOrder || isNaN(orderNum) || orderNum < 1) {
			newErrors.displayOrder = "Display order must be at least 1"
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!validate()) return

		const validOverrides = feeOverrides
			.filter((fo) => fo.eventFeeId > 0 && fo.amount.trim() !== "")
			.map((fo) => ({
				eventFeeId: fo.eventFeeId,
				amount: parseFloat(fo.amount),
			}))
			.filter((fo) => !isNaN(fo.amount))

		void onSubmit({
			name: name.trim(),
			registrationLimit: Number(registrationLimit),
			displayOrder: Number(displayOrder),
			feeOverrides: validOverrides,
		})
	}

	const addFeeOverride = () => {
		setFeeOverrides([...feeOverrides, { eventFeeId: 0, amount: "" }])
	}

	const removeFeeOverride = (index: number) => {
		setFeeOverrides(feeOverrides.filter((_, i) => i !== index))
	}

	const updateFeeOverride = (index: number, field: "eventFeeId" | "amount", value: string) => {
		const current = feeOverrides[index]
		if (!current) return
		const updated = [...feeOverrides]
		if (field === "eventFeeId") {
			updated[index] = { ...current, eventFeeId: Number(value) }
		} else {
			updated[index] = { ...current, amount: value }
		}
		setFeeOverrides(updated)
	}

	// Determine which event fees are already used in overrides
	const usedFeeIds = new Set(feeOverrides.map((fo) => fo.eventFeeId).filter((id) => id > 0))

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FormField label="Name" error={errors.name}>
				<input
					type="text"
					className={`input input-bordered w-full ${errors.name ? "input-error" : ""}`}
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={isSubmitting}
				/>
			</FormField>

			<FormField label="Registration Limit" error={errors.registrationLimit}>
				<input
					type="number"
					className={`input input-bordered w-full ${errors.registrationLimit ? "input-error" : ""}`}
					value={registrationLimit}
					onChange={(e) => setRegistrationLimit(e.target.value)}
					disabled={isSubmitting}
					min={1}
				/>
			</FormField>

			<FormField label="Display Order" error={errors.displayOrder}>
				<input
					type="number"
					className={`input input-bordered w-full ${errors.displayOrder ? "input-error" : ""}`}
					value={displayOrder}
					onChange={(e) => setDisplayOrder(e.target.value)}
					disabled={isSubmitting}
					min={1}
				/>
			</FormField>

			{eventFees.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="label-text font-semibold">Fee Overrides</span>
						<button
							type="button"
							className="btn btn-sm btn-ghost"
							onClick={addFeeOverride}
							disabled={isSubmitting || feeOverrides.length >= eventFees.length}
						>
							+ Add Override
						</button>
					</div>

					{feeOverrides.length === 0 && (
						<p className="text-sm text-base-content/60">
							No fee overrides. Session will use the default event fees.
						</p>
					)}

					{feeOverrides.map((override, index) => (
						<div key={index} className="flex items-end gap-2">
							<FormField label="Fee" className="flex-1">
								<select
									className="select select-bordered w-full"
									value={override.eventFeeId}
									onChange={(e) => updateFeeOverride(index, "eventFeeId", e.target.value)}
									disabled={isSubmitting}
								>
									<option value={0}>Select a fee...</option>
									{eventFees.map((fee) => (
										<option
											key={fee.id}
											value={fee.id}
											disabled={usedFeeIds.has(fee.id) && fee.id !== override.eventFeeId}
										>
											{fee.feeType?.name ?? `Fee #${fee.id}`} (${fee.amount.toFixed(2)})
										</option>
									))}
								</select>
							</FormField>

							<FormField label="Override Amount" className="flex-1">
								<input
									type="number"
									className="input input-bordered w-full"
									value={override.amount}
									onChange={(e) => updateFeeOverride(index, "amount", e.target.value)}
									disabled={isSubmitting}
									step="0.01"
									min="0"
									placeholder="0.00"
								/>
							</FormField>

							<button
								type="button"
								className="btn btn-sm btn-ghost text-error mb-1"
								onClick={() => removeFeeOverride(index)}
								disabled={isSubmitting}
							>
								Remove
							</button>
						</div>
					))}
				</div>
			)}

			<div className="flex gap-2 justify-end pt-4">
				<button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
					Cancel
				</button>
				<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<span className="loading loading-spinner loading-sm"></span>
							{isEditMode ? "Saving..." : "Creating..."}
						</>
					) : isEditMode ? (
						"Save"
					) : (
						"Create"
					)}
				</button>
			</div>
		</form>
	)
}
