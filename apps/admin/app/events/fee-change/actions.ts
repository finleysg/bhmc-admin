"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
	EventTypeChoices,
	type SeasonFeeChange,
	type SeasonFeeChangeInput,
} from "@repo/domain/types"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

import { NONE } from "../event-settings"

export type FeeChangeField = "feeTypeId" | "fromAmount" | "toAmount" | "eventType"

export interface FeeChangeState extends FormState<FeeChangeField> {
	/** The last preview, or the applied change. */
	change?: SeasonFeeChange
}

const amount = z
	.string()
	.trim()
	.min(1, "Enter an amount")
	.transform(Number)
	.pipe(
		z
			.number({ error: "Enter an amount" })
			.min(0, "Cannot be negative")
			.multipleOf(0.01, "Use whole cents"),
	)

const changeSchema = z
	.object({
		feeTypeId: z.coerce.number({ error: "Choose a fee type" }).int().positive("Choose a fee type"),
		fromAmount: amount,
		toAmount: amount,
		eventType: z
			.string()
			.transform((v) => (v === NONE || v === "" ? null : v))
			.pipe(z.enum(EventTypeChoices).nullable()),
	})
	.refine((c) => c.fromAmount !== c.toAmount, {
		path: ["toAmount"],
		message: "The new amount must differ from the old amount",
	})

const sameChange = (a: SeasonFeeChange, b: SeasonFeeChangeInput) =>
	a.feeTypeId === b.feeTypeId &&
	a.fromAmount === b.fromAmount &&
	a.toAmount === b.toAmount &&
	a.eventType === (b.eventType ?? null)

/**
 * Previews a season fee change, or (intent "apply") applies the change just previewed.
 * Applying refuses values that differ from the preview, so what changes is what was shown.
 */
export async function changeSeasonFee(
	season: number,
	prev: FeeChangeState,
	formData: FormData,
): Promise<FeeChangeState> {
	const parsed = changeSchema.safeParse({
		feeTypeId: formData.get("feeTypeId") ?? "",
		fromAmount: formData.get("fromAmount") ?? "",
		toAmount: formData.get("toAmount") ?? "",
		eventType: formData.get("eventType") ?? "",
	})
	if (!parsed.success) {
		const fieldErrors: Partial<Record<FeeChangeField, string>> = {}
		for (const issue of parsed.error.issues) {
			fieldErrors[issue.path[0] as FeeChangeField] ??= issue.message
		}
		return { status: "error", message: "Check the highlighted fields", fieldErrors }
	}
	const input: SeasonFeeChangeInput = { season, ...parsed.data }

	if (formData.get("intent") !== "apply") {
		const result = await apiRequest<SeasonFeeChange>("/seasons/fee-change/preview", "POST", input)
		if (!result.ok) return { status: "error", message: result.message }
		return { status: "idle", change: result.data }
	}

	if (!prev.change || prev.change.applied || !sameChange(prev.change, input)) {
		return {
			...prev,
			status: "error",
			message: "The change differs from the preview. Preview it again before applying.",
		}
	}
	const result = await apiRequest<SeasonFeeChange>("/seasons/fee-change", "POST", input)
	if (!result.ok) return { ...prev, status: "error", message: result.message }

	revalidatePath("/events", "layout")
	const changed = result.data.events.filter((e) => e.refused === null).length
	return {
		status: "success",
		message: `${result.data.feeTypeName} changed on ${changed} event${changed === 1 ? "" : "s"}`,
		change: result.data,
	}
}
