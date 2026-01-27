import { PlayerInfo } from "../../components/account/player-info"
import { PlayerPassword } from "../../components/account/player-password"

export function MemberAccountScreen() {
	return (
		<div className="content__inner">
			<div className="container py-4">
				<div style={{ maxWidth: "400px" }}>
					<h2 className="mb-4 text-primary">Account Settings</h2>
					<PlayerInfo />
					<div className="mt-4">
						<PlayerPassword />
					</div>
				</div>
			</div>
		</div>
	)
}
