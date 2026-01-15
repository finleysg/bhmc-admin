import defaultProfilePic from "../../assets/img/unknown.jpg"
import { PlayerProps } from "../../models/common-props"

export function ProfileImage({ player }: PlayerProps) {
	if (player.profilePicture?.imageUrl()) {
		return (
			<div style={{ position: "relative" }}>
				<picture>
					<source srcSet={player.profilePicture.mobileImageUrl()} media="(max-width: 600px)" />
					<source srcSet={player.profilePicture.webImageUrl()} media="(max-width: 1200px)" />
					<img className="img-responsive" src={player.profilePicture.imageUrl()} alt="Profile" />
				</picture>
			</div>
		)
	}
	return <img className="img-responsive" src={defaultProfilePic} alt="Profile" />
}
