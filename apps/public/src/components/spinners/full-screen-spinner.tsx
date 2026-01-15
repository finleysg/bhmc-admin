import { FidgetSpinner } from "./spinner"

export function FullPageSpinner() {
	return (
		<div
			style={{
				fontSize: "4em",
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
				color: "green",
			}}
		>
			<FidgetSpinner />
		</div>
	)
}
