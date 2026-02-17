"use client"

import { useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import { useUploadPhoto } from "@/lib/hooks/use-upload-photo"
import type { PlayerDetail } from "@/lib/types"
import { ProfilePhotoPicker } from "../account/components/profile-photo-picker"

interface ProfileHeaderProps {
	player: PlayerDetail
}

export function ProfileHeader({ player }: ProfileHeaderProps) {
	const [editMode, setEditMode] = useState(false)
	const { mutate: upload, isPending } = useUploadPhoto()

	const initials = (player.first_name[0] ?? "") + (player.last_name[0] ?? "")
	const photoUrl = player.profile_picture?.image_url
		? resolvePhotoUrl(player.profile_picture.image_url)
		: undefined

	const handleSelectedFile = (file: File) => {
		const form = new FormData()
		form.append("player_id", player.id.toString())
		form.append("year", "0")
		form.append("caption", `${player.first_name} ${player.last_name}`)
		form.append("raw_image", file, file.name)

		upload(form, {
			onSuccess: () => setEditMode(false),
		})
	}

	if (editMode) {
		return (
			<div className="flex flex-col items-center gap-4">
				{isPending ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="size-5 animate-spin" />
						Uploading...
					</div>
				) : (
					<ProfilePhotoPicker onSelect={handleSelectedFile} onClose={() => setEditMode(false)} />
				)}
			</div>
		)
	}

	return (
		<div className="flex flex-col items-center gap-3">
			<div className="relative">
				<Avatar className="size-24">
					<AvatarImage src={photoUrl} alt="Profile" />
					<AvatarFallback className="text-2xl">{initials}</AvatarFallback>
				</Avatar>
				<Button
					variant="secondary"
					size="icon"
					className="absolute -bottom-1 -right-1 size-8 rounded-full"
					onClick={() => setEditMode(true)}
					aria-label="Edit profile photo"
				>
					<Camera className="size-4" />
				</Button>
			</div>
			<h2 className="text-xl font-semibold">
				{player.first_name} {player.last_name}
			</h2>
		</div>
	)
}
