"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Pencil, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateMyPlayer } from "@/lib/hooks/use-my-player"
import { PlayerUpdateSchema, type PlayerUpdateData } from "@/lib/schemas/account"
import type { PlayerDetail } from "@/lib/types"

interface PlayerInfoProps {
	player: PlayerDetail
}

function calculateAge(birthDate: string | null): string {
	if (!birthDate) return "Not given"
	const today = new Date()
	const birth = new Date(birthDate)
	let age = today.getFullYear() - birth.getFullYear()
	const monthDiff = today.getMonth() - birth.getMonth()
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
		age--
	}
	return String(age)
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex gap-4 py-2">
			<dt className="w-32 shrink-0 text-sm font-medium text-muted-foreground">{label}</dt>
			<dd className="text-sm">{value}</dd>
		</div>
	)
}

export function PlayerInfo({ player }: PlayerInfoProps) {
	const [mode, setMode] = useState<"view" | "edit">("view")
	const { mutate: updatePlayer, isPending } = useUpdateMyPlayer()

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<PlayerUpdateData>({
		resolver: zodResolver(PlayerUpdateSchema),
		defaultValues: {
			first_name: player.first_name,
			last_name: player.last_name,
			email: player.email,
			ghin: player.ghin ?? "",
			birth_date: player.birth_date ?? "",
			phone_number: player.phone_number ?? "",
		},
	})

	const onSubmit = (data: PlayerUpdateData) => {
		updatePlayer(
			{ id: player.id, data },
			{
				onSuccess: () => setMode("view"),
			},
		)
	}

	const handleCancel = () => {
		reset()
		setMode("view")
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-primary">
					<User className="size-5" />
					Player Profile
				</CardTitle>
				{mode === "view" && (
					<Button variant="ghost" size="sm" onClick={() => setMode("edit")}>
						<Pencil className="mr-1 size-4" />
						Edit
					</Button>
				)}
			</CardHeader>
			<CardContent>
				{mode === "view" ? (
					<div>
						<dl>
							<InfoRow label="Full Name" value={`${player.first_name} ${player.last_name}`} />
							<InfoRow label="Email" value={player.email} />
							<InfoRow label="GHIN" value={player.ghin ?? "No GHIN"} />
							<InfoRow label="Age" value={calculateAge(player.birth_date)} />
							<InfoRow label="Phone" value={player.phone_number ?? "Not given"} />
							<InfoRow label="Tee" value={player.tee ?? "Not set"} />
						</dl>
						<div className="mt-4">
							<Link
								href={`/member/directory/${player.id}`}
								className="text-sm text-primary hover:underline"
							>
								View my public profile
							</Link>
						</div>
					</div>
				) : (
					<form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="first_name">First Name</Label>
								<Input id="first_name" {...register("first_name")} />
								{errors.first_name && (
									<p className="text-xs text-destructive">{errors.first_name.message}</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="last_name">Last Name</Label>
								<Input id="last_name" {...register("last_name")} />
								{errors.last_name && (
									<p className="text-xs text-destructive">{errors.last_name.message}</p>
								)}
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" {...register("email")} />
							{errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="ghin">GHIN</Label>
								<Input id="ghin" {...register("ghin")} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="birth_date">Birth Date</Label>
								<Input id="birth_date" type="date" {...register("birth_date")} />
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="phone_number">Phone Number</Label>
							<Input id="phone_number" {...register("phone_number")} />
						</div>
						<p className="text-sm text-primary">
							<span className="font-bold">NOTE:</span> If you want to move to the forward tees and
							you qualify using the rule of 78, send us a contact message.
						</p>
						<div className="flex gap-2">
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
							<Button type="button" variant="outline" onClick={handleCancel}>
								Cancel
							</Button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	)
}
