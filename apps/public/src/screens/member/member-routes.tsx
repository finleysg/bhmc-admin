import { MemberHub } from "./member-hub"
import { MemberAccountScreen } from "./member-account"
import { MemberFriendsScreen } from "./member-friends"
import { MemberResultsScreen } from "./member-results"
import { MemberScoresScreen } from "./member-scores"

export { MemberHub, MemberAccountScreen, MemberFriendsScreen, MemberResultsScreen, MemberScoresScreen }


export function ResultsPlaceholder() {
	return (
		<div className="content__inner">
			<div className="card">
				<div className="card-body">
					<h2>Results</h2>
					<p>This is a placeholder for the results page.</p>
				</div>
			</div>
		</div>
	)
}
