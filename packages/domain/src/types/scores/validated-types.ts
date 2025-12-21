import { Player } from "../register/player"
import { Score } from "./score"
import { Scorecard } from "./scorecard"

export type ValidatedScorecard = Omit<Scorecard, "scores"> & {
	scoreType: "net | gross"
	player: Player
	scores: Score[]
}
