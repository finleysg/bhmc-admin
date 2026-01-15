import Lost from "../assets/img/LostBall.jpg"

export function NotFoundScreen() {
	return (
		<div className="content__inner">
			<div style={{ margin: "20px auto 0 auto", textAlign: "center" }}>
				<h1 className="text-primary">404</h1>
				<img src={Lost} alt="404 Not Found" />
				<h3>Better hit another...</h3>
				<p>I don&apos;t think you&apos;re going to find that one.</p>
			</div>
		</div>
	)
}
