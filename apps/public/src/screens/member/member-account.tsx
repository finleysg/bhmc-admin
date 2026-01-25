import { PlayerInfo } from "../../components/account/player-info"
import { PlayerPassword } from "../../components/account/player-password"

export function MemberAccountScreen() {
	return (
		<div className="content__inner">
			<div className="container py-4">
				<h1 className="mb-4">Account Settings</h1>
				<PlayerInfo />
				<div className="mt-4">
					<PlayerPassword />
				</div>
			</div>
		</div>
	)
}
