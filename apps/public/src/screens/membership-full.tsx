import { RandomGif } from "../components/giphy/random-gif"
import { currentSeason } from "../utils/app-config"

export function MembershipFull() {
	return (
		<div className="content__inner">
			<div style={{ margin: "20px auto 0 auto", textAlign: "center" }}>
				<RandomGif enabled={true} gifId="75xuCyOKqqibJ9CMb1" />
				<h3 className="text-primary" style={{ marginTop: "30px" }}>
					We are at capacity for {currentSeason}
				</h3>
				<p>
					Thank you for your interest in the Bunker Hills Men&apos;s Golf Club. Our membership is
					full for the {currentSeason} season. Please consider us for next year.
				</p>
			</div>
		</div>
	)
}
