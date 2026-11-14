"use client"

import { startTransition, useActionState } from "react"
import { toast } from "sonner"

import type { AdminRole, PlayerAdminRoles } from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/shadcn/field"

import { type FormState, setPlayerRoles } from "../actions"

const ROLE_OPTIONS: { role: AdminRole; label: string; description: string }[] = [
	{
		role: "event-admin",
		label: "Event Admin",
		description: "Events, registrations, Golf Genius, and event reports.",
	},
	{
		role: "club-admin",
		label: "Club Admin",
		description: "Membership, players, documents, announcements, and settings.",
	},
]

interface PlayerRolesCardProps {
	playerId: number
	/** Null when the player has no login account. */
	current: PlayerAdminRoles | null
}

export function PlayerRolesCard({ playerId, current }: PlayerRolesCardProps) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState, formData: FormData) => {
			const result = await setPlayerRoles(playerId, prev, formData)
			if (result.status === "success") toast.success(result.message)
			return result
		},
		{ status: "idle" },
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-heading">Admin Roles</CardTitle>
				<CardDescription>Roles grant access to the admin site.</CardDescription>
			</CardHeader>
			{current === null ? (
				<CardContent>
					<p className="text-sm text-muted-foreground">
						This player has no login account, so admin roles cannot be granted.
					</p>
				</CardContent>
			) : (
				<form
					// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
					onSubmit={(e) => {
						e.preventDefault()
						const formData = new FormData(e.currentTarget)
						startTransition(() => formAction(formData))
					}}
					className="space-y-6"
				>
					<CardContent className="space-y-4">
						{state.status === "error" && (
							<Alert variant="destructive">
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						)}
						{current.isSuperuser && (
							<Alert>
								<AlertDescription>
									This player is a superuser and holds every role regardless of these settings.
								</AlertDescription>
							</Alert>
						)}
						<fieldset disabled={isPending} className="space-y-4">
							<legend className="sr-only">Admin roles</legend>
							{ROLE_OPTIONS.map(({ role, label, description }) => (
								<Field key={role} orientation="horizontal">
									<Checkbox
										id={`role-${role}`}
										name="roles"
										value={role}
										defaultChecked={current.roles.includes(role)}
									/>
									<FieldContent>
										<FieldLabel htmlFor={`role-${role}`}>{label}</FieldLabel>
										<FieldDescription>{description}</FieldDescription>
									</FieldContent>
								</Field>
							))}
						</fieldset>
					</CardContent>
					<CardFooter className="justify-end">
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save Roles"}
						</Button>
					</CardFooter>
				</form>
			)}
		</Card>
	)
}
