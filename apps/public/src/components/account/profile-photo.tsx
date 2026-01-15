import React from "react"

import { toast } from "react-toastify"

import defaultProfilePic from "../../assets/img/unknown.jpg"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { useUploadPhoto } from "../../hooks/use-photo"
import { LoadingSpinner } from "../spinners/loading-spinner"
import { ProfilePhotoPicker } from "./profile-photo-picker"

export function ProfilePhoto() {
	const [mode, setMode] = React.useState("view")
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

	if (mode === "view" && player) {
		return (
			<div className="pm-overview c-overflow">
				<div className="pmo-pic">
					<div className="p-relative">
						<span>
							{player.profilePicture?.imageUrl() ? (
								<picture>
									<source
										srcSet={player.profilePicture.mobileImageUrl()}
										media="(max-width: 600px)"
									/>
									<source
										srcSet={player.profilePicture.webImageUrl()}
										media="(max-width: 1200px)"
									/>
									<img src={player.profilePicture.imageUrl()} alt="Profile" />
								</picture>
							) : (
								<img className="img-responsive" src={defaultProfilePic} alt="Default Profile" />
							)}
						</span>
					</div>
					<div className="pmo-stat">
						<h2>{player.name}</h2>
						<button onClick={() => setMode("edit")} className="btn btn-link btn-sm">
							Update Profile Picture
						</button>
					</div>
				</div>
			</div>
		)
	} else {
		return (
			<React.Fragment>
				{status === "pending" && <LoadingSpinner loading={true} paddingTop="90px" />}
				{status !== "pending" && (
					<ProfilePhotoPicker onSelect={handleSelectedFile} onClose={() => setMode("view")} />
				)}
			</React.Fragment>
		)
	}
}
