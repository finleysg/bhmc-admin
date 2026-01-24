import { useState } from "react"

import { MdEdit } from "react-icons/md"
import { toast } from "react-toastify"

import defaultProfilePic from "../../assets/img/unknown.jpg"
import { ProfilePhotoPicker } from "../../components/account/profile-photo-picker"
import { LoadingSpinner } from "../../components/spinners/loading-spinner"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { useUploadPhoto } from "../../hooks/use-photo"

export function ProfileHeader() {
	const [mode, setMode] = useState("view")
	const { data: player } = useMyPlayerRecord()
	const { mutate: upload, status } = useUploadPhoto()

	const handleSelectedFile = (file: File) => {
		if (!player) return
		const form = new FormData()
		form.append("player_id", player.id.toString())
		form.append("year", "0")
		form.append("caption", player.name)
		form.append("raw_image", file, file.name)

		upload(form, {
			onSuccess: () => {
				toast.success("📸 Your profile picture has been updated")
				setMode("view")
			},
		})
	}

	if (!player) {
		return null
	}

	if (mode === "edit") {
		return (
			<div className="profile-header-edit">
				{status === "pending" && <LoadingSpinner loading={true} paddingTop="90px" />}
				{status !== "pending" && (
					<ProfilePhotoPicker onSelect={handleSelectedFile} onClose={() => setMode("view")} />
				)}
			</div>
		)
	}

	return (
		<div className="profile-header text-center">
			<div className="profile-header-photo position-relative">
				{player.profilePicture?.imageUrl() ? (
					<picture>
						<source srcSet={player.profilePicture.mobileImageUrl()} media="(max-width: 600px)" />
						<source srcSet={player.profilePicture.webImageUrl()} media="(max-width: 1200px)" />
						<img
							src={player.profilePicture.imageUrl()}
							alt="Profile"
							className="img-fluid rounded-circle"
							style={{ maxWidth: "150px", maxHeight: "150px", objectFit: "cover" }}
						/>
					</picture>
				) : (
					<img
						className="img-fluid rounded-circle"
						src={defaultProfilePic}
						alt="Default Profile"
						style={{ maxWidth: "150px", maxHeight: "150px", objectFit: "cover" }}
					/>
				)}
				<button
					className="btn btn-sm btn-light position-absolute bottom-0 end-0 rounded-circle"
					onClick={() => setMode("edit")}
					style={{
						width: "36px",
						height: "36px",
						transform: "translate(-25%, -25%)",
					}}
					aria-label="Edit profile photo"
				>
					<MdEdit />
				</button>
			</div>
			<h3 className="mt-3">{player.name}</h3>
		</div>
	)
}
