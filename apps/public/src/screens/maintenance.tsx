import { RandomGif } from "../components/giphy/random-gif"

export function MaintenanceScreen() {
	return (
		<div className="content__inner">
			<div style={{ margin: "20px auto 0 auto", textAlign: "center" }}>
				<h1 className="text-danger">System Maintenance</h1>
				<RandomGif enabled={true} gifId="gwAYrJaPllFEH55xua" />
				<h3 className="text-primary" style={{ marginTop: "30px" }}>
					We&apos;re Doing Some Work
				</h3>
				<p>The website will return soon.</p>
			</div>
		</div>
	)
}
