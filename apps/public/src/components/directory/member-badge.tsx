import { PlayerProps } from "../../models/common-props"
import { currentSeason } from "../../utils/app-config"

export function MemberBadge({ player }: PlayerProps) {
	if (player.isMember) {
		return (
			<h6 className="text-info" style={{ marginBottom: "1rem" }}>
				🏌️‍♂️ {currentSeason} Member
			</h6>
		)
	}
	return null
}
