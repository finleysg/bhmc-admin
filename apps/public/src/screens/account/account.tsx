import { PlayerInfo } from "../../components/account/player-info"
import { PlayerPassword } from "../../components/account/player-password"
import { ProfilePhoto } from "../../components/account/profile-photo"

export function AccountScreen() {
	return (
		<div className="content__inner">
			<div className="card">
				<div className="card-body">
					<div className="row">
						<div className="col-sm-4">
							<ProfilePhoto />
						</div>
						<div className="col-sm-8">
							<PlayerInfo />
							<PlayerPassword />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
