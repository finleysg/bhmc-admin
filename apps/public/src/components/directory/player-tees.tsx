import { PlayerProps } from "../../models/common-props"

export function PlayerTees({ player }: PlayerProps) {
	return (
		<h6 className="text-info" style={{ marginBottom: "1rem" }}>
			⛳ Plays {player.tee} Tees
		</h6>
	)
}
