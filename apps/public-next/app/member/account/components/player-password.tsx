"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChangePassword } from "@/lib/hooks/use-change-password"
import { ChangePasswordSchema, type ChangePasswordData } from "@/lib/schemas/account"

export function PlayerPassword() {
	const [mode, setMode] = useState<"view" | "edit">("view")
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const { mutate: changePassword, isPending } = useChangePassword()

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<ChangePasswordData>({
		resolver: zodResolver(ChangePasswordSchema),
	})

	const onSubmit = (data: ChangePasswordData) => {
		setErrorMessage(null)
		setSuccessMessage(null)
		changePassword(data, {
			onSuccess: () => {
				setSuccessMessage("Password changed successfully")
				reset()
				setMode("view")
			},
			onError: (error) => {
				try {
					const parsed = JSON.parse(error.message) as Record<string, string[]>
					const firstError =
						parsed.current_password?.[0] ??
						parsed.new_password?.[0] ??
						Object.values(parsed).flat()[0] ??
						"Failed to change password"
					setErrorMessage(firstError)
				} catch {
					setErrorMessage("Failed to change password")
				}
			},
		})
	}

	const handleCancel = () => {
		reset()
		setErrorMessage(null)
		setMode("view")
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-primary">
					<Lock className="size-5" />
					Password
				</CardTitle>
				{mode === "view" && (
					<Button variant="ghost" size="sm" onClick={() => setMode("edit")}>
						<Pencil className="mr-1 size-4" />
						Change
					</Button>
				)}
			</CardHeader>
			<CardContent>
				{successMessage && <p className="mb-4 text-sm text-green-600">{successMessage}</p>}

				{mode === "view" ? (
					<p className="text-sm text-muted-foreground">
						Click &quot;Change&quot; to update your password.
					</p>
				) : (
					<form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
						{errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
						<div className="space-y-2">
							<Label htmlFor="current_password">Current Password</Label>
							<Input id="current_password" type="password" {...register("current_password")} />
							{errors.current_password && (
								<p className="text-xs text-destructive">{errors.current_password.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="new_password">New Password</Label>
							<Input id="new_password" type="password" {...register("new_password")} />
							{errors.new_password && (
								<p className="text-xs text-destructive">{errors.new_password.message}</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="re_new_password">Confirm New Password</Label>
							<Input id="re_new_password" type="password" {...register("re_new_password")} />
							{errors.re_new_password && (
								<p className="text-xs text-destructive">{errors.re_new_password.message}</p>
							)}
						</div>
						<div className="flex gap-2">
							<Button type="submit" disabled={isPending}>
								{isPending ? "Changing..." : "Change Password"}
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
