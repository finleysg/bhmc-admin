import { MdAccountCircle, MdEmojiEvents, MdPeople, MdScore } from "react-icons/md"

import { MemberCard } from "./member-card"
import { ProfileHeader } from "./profile-header"

export function MemberHub() {
	return (
		<div className="content__inner">
			<div className="container py-4">
				<ProfileHeader />

				<div className="row g-4 mt-4">
					<div className="col-12 col-md-6">
						<MemberCard
							title="Account"
							description="Manage your account information and change your password"
							icon={MdAccountCircle}
							action="/member/account"
						/>
					</div>
					<div className="col-12 col-md-6">
						<MemberCard
							title="Friends"
							description="View and manage your friends list"
							icon={MdPeople}
							action="/member/friends"
						/>
					</div>
					<div className="col-12 col-md-6">
						<MemberCard
							title="Scores"
							description="View your scoring history and download your scores to Excel"
							icon={MdScore}
							action="/member/scores"
						/>
					</div>
					<div className="col-12 col-md-6">
						<MemberCard
							title="Results"
							description="Check your tournament results, season long points, and skins"
							icon={MdEmojiEvents}
							action="/member/results"
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
