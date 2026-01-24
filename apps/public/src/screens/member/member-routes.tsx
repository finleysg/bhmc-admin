import { MemberHub } from "./member-hub"
import { MemberAccountScreen } from "./member-account"
import { MemberFriendsScreen } from "./member-friends"

export { MemberHub, MemberAccountScreen, MemberFriendsScreen }

export function ScoresPlaceholder() {
	return (
		<div className="content__inner">
			<div className="card">
				<div className="card-body">
					<h2>Scores</h2>
					<p>This is a placeholder for the scores page.</p>
				</div>
			</div>
		</div>
	)
}

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
