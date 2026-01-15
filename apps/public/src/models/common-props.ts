import { ClubEvent } from "./club-event"
import { Course } from "./course"
import { MajorChampion } from "./major-champion"
import { Player } from "./player"
import { Round } from "./scores"

export interface SeasonProps {
	season: number
}

export interface CloseableProps {
	onClose: () => void
}

export interface ClubEventProps {
	clubEvent: ClubEvent
}

export interface MajorChampionProps {
	champion: MajorChampion
}

export interface PlayerProps {
	player: Player
}

export interface CourseProps {
	course: Course
}

export interface RoundProps {
	round: Round
}

export interface RoundsProps {
	rounds: Round[]
}
