import { ScoreDto } from "./score.dto"
import { ScorecardDto } from "./scorecard.dto"

/**
 * Maps database entity to ScoreDto
 */
export function mapToScoreDto(entity: any): ScoreDto {
	return {
		id: entity.id,
		score: entity.score,
		isNet: !!entity.isNet,
		holeId: entity.holeId,
	}
}

/**
 * Maps ScoreDto to database entity for insert/update
 */
export function mapScoreDtoToEntity(dto: ScoreDto): any {
	return {
		score: dto.score,
		isNet: dto.isNet ? 1 : 0,
		holeId: dto.holeId,
		scorecardId: dto.scoreCardId,
	}
}

/**
 * Maps database entity to ScorecardDto
 */
export function mapToScorecardDto(entity: any): ScorecardDto {
	return {
		id: entity.id,
		handicapIndex: entity.handicapIindex,
		courseHandicap: entity.courseHandicap,
		courseId: entity.courseId,
		eventId: entity.eventId,
		playerId: entity.playerId,
		teeId: entity.teeId,
	}
}

/**
 * Maps ScorecardDto to database entity for insert/update
 */
export function mapScorecardDtoToEntity(dto: ScorecardDto): any {
	return {
		id: dto.id,
		handicapIndex: dto.handicapIndex,
		courseHandicap: dto.courseHandicap,
		courseId: dto.courseId,
		eventId: dto.eventId,
		playerId: dto.playerId,
		teeId: dto.teeId,
	}
}
