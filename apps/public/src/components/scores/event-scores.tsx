import { RoundsProps } from "../../models/common-props"
import { CourseInRound } from "../../models/scores"
import { HoleNumbers, HolePars, HolesProps, RoundScores } from "./score-utils"

interface EventRoundsByCourseProps extends HolesProps, RoundsProps {
	course: CourseInRound
}

// TODO: this needs player names and ghins for rendering scores by event
export function EventRoundsByCourse({
	course,
	holes,
	courseName,
	rounds,
}: EventRoundsByCourseProps) {
	return (
		<div className="card">
			{rounds.length > 0 ? (
				<div className="card-body">
					<h4>{course.name}</h4>
					<HoleNumbers holes={holes} courseName={courseName} />
					<HolePars holes={holes} courseName={courseName} />
					{rounds.map((round) => {
						return <RoundScores key={round.eventDate} round={round} scoreType="Gross" />
					})}
				</div>
			) : (
				<div className="card-body">No rounds played</div>
			)}
		</div>
	)
}
