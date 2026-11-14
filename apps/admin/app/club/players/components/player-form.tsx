"use client"

import Link from "next/link"
import { startTransition, useActionState } from "react"
import { toast } from "sonner"

import type { Player } from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"

import { DetailItem, DetailList } from "@/components/detail-list"

import { type FormState, type PlayerField, updatePlayer } from "../actions"

export function PlayerForm({ player }: { player: Player }) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState<PlayerField>, formData: FormData) => {
			const result = await updatePlayer(player.id, prev, formData)
			if (result.status === "success") toast.success(result.message)
			return result
		},
		{ status: "idle" },
	)
	const errors = state.fieldErrors ?? {}

	return (
		<form
			// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
			onSubmit={(e) => {
				e.preventDefault()
				const formData = new FormData(e.currentTarget)
				startTransition(() => formAction(formData))
			}}
			className="space-y-6"
			noValidate
		>
			<div className="rounded-lg bg-muted p-4">
				<h3 className="mb-2 text-sm font-semibold text-muted-foreground">Account Info</h3>
				<DetailList>
					<DetailItem label="ID" value={player.id} />
					<DetailItem label="Last Season" value={player.lastSeason} />
					<DetailItem label="GG ID" value={player.ggId} />
					<DetailItem label="User ID" value={player.userId} />
					<DetailItem label="Stripe ID" value={player.stripeCustomerId} />
				</DetailList>
			</div>

			{state.status === "error" && (
				<Alert variant="destructive">
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}

			<fieldset disabled={isPending} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field data-invalid={!!errors.firstName}>
					<FieldLabel htmlFor="firstName">
						First Name
						<span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id="firstName"
						aria-invalid={!!errors.firstName}
						name="firstName"
						defaultValue={player.firstName}
					/>
					<FieldError>{errors.firstName}</FieldError>
				</Field>
				<Field data-invalid={!!errors.lastName}>
					<FieldLabel htmlFor="lastName">
						Last Name
						<span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id="lastName"
						aria-invalid={!!errors.lastName}
						name="lastName"
						defaultValue={player.lastName}
					/>
					<FieldError>{errors.lastName}</FieldError>
				</Field>
				<Field data-invalid={!!errors.email}>
					<FieldLabel htmlFor="email">
						Email
						<span className="text-destructive">*</span>
					</FieldLabel>
					<Input
						id="email"
						aria-invalid={!!errors.email}
						name="email"
						type="email"
						defaultValue={player.email}
					/>
					<FieldError>{errors.email}</FieldError>
				</Field>
				<Field data-invalid={!!errors.phoneNumber}>
					<FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
					<Input
						id="phoneNumber"
						aria-invalid={!!errors.phoneNumber}
						name="phoneNumber"
						type="tel"
						defaultValue={player.phoneNumber ?? ""}
					/>
					<FieldError>{errors.phoneNumber}</FieldError>
				</Field>
				<Field data-invalid={!!errors.ghin}>
					<FieldLabel htmlFor="ghin">GHIN</FieldLabel>
					<Input
						id="ghin"
						aria-invalid={!!errors.ghin}
						name="ghin"
						maxLength={8}
						defaultValue={player.ghin ?? ""}
					/>
					<FieldError>{errors.ghin}</FieldError>
				</Field>
				<Field data-invalid={!!errors.tee}>
					<FieldLabel htmlFor="tee">Tee</FieldLabel>
					<Select name="tee" defaultValue={player.tee}>
						<SelectTrigger id="tee" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Club">Club</SelectItem>
							<SelectItem value="Gold">Gold</SelectItem>
						</SelectContent>
					</Select>
					<FieldError>{errors.tee}</FieldError>
				</Field>
				<Field data-invalid={!!errors.birthDate}>
					<FieldLabel htmlFor="birthDate">Birth Date</FieldLabel>
					<Input
						id="birthDate"
						aria-invalid={!!errors.birthDate}
						name="birthDate"
						type="date"
						defaultValue={player.birthDate ?? ""}
					/>
					<FieldError>{errors.birthDate}</FieldError>
				</Field>
				<Field orientation="horizontal" className="sm:pt-7">
					<Checkbox id="isMember" name="isMember" defaultChecked={player.isMember} />
					<FieldLabel htmlFor="isMember">Active member</FieldLabel>
				</Field>
			</fieldset>

			<div className="flex justify-end gap-2">
				<Button variant="outline" asChild>
					<Link href="/club/players">Cancel</Link>
				</Button>
				<Button type="submit" disabled={isPending}>
					{isPending ? "Saving..." : "Save"}
				</Button>
			</div>
		</form>
	)
}
