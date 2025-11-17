// // Score DTO exports
// export { CreateScorecardDto } from "./dto/scores/create-scorecard.dto"
// export { UpdateScorecardDto } from "./dto/scores/update-scorecard.dto"
// export { CreateScoreDto } from "./dto/scores/create-score.dto"
// export { UpdateScoreDto } from "./dto/scores/update-score.dto"

// // Course DTO exports
// export { CourseDto } from "./courses/course.dto"
// export { TeeDto } from "./courses/tee.dto"
// export { HoleDto } from "./courses/hole.dto"

// // Event DTO exports
// export { EventDto } from "./dto/events/event.dto"
// export { EventFeeDto, FeeTypeDto } from "./dto/events/event-fee.dto"
// export { EventPlayerFeeDto } from "./dto/events/event-player-fee.dto"
// export { EventPlayerSlotDto } from "./dto/events/event-player-slot.dto"
// export { EventRegistrationSummaryDto } from "./dto/events/event-registration-summary.dto"

// // Golf Genius DTO exports
// export { IntegrationActionName, IntegrationLogDto } from "./dto/golf-genius/integration-log.dto"
// export { ProgressEventDto } from "./dto/golf-genius/progress-event.dto"
// export { ProgressTournamentDto } from "./dto/golf-genius/progress-tournament.dto"
// export { TournamentData } from "./dto/golf-genius/tournament-data.dto"
// export { PlayerMap, PlayerRecord } from "./dto/golf-genius/player-map.dto"
// export { PreparedTournamentPoints } from "./dto/golf-genius/tournament-points.dto"
// export { PreparedTournamentResult } from "./dto/golf-genius/tournament-result.dto"

// // Reports DTO exports
// export { EventReportRowDto } from "./dto/reports/event-report-row.dto"
// export { EventReportQueryDto } from "./dto/reports/event-report-query.dto"
// export { FinanceReportDto } from "./dto/reports/finance-report.dto"
// export { PointsReportRowDto } from "./dto/reports/points-report-row.dto"
// export { EventResultsReportDto } from "./dto/reports/event-results-report.dto"
// export { EventResultsSectionDto } from "./dto/reports/event-results-section.dto"
// export { EventResultsReportRowDto } from "./dto/reports/event-results-report-row.dto"

// // Registration DTO exports
// export {
// 	AddAdminRegistrationDto,
// 	AddAdminRegistrationSlotsDto,
// } from "./register/admin-registration.dto"
// export { PlayerDto } from "./register/player.dto"
// export { RegistrationDto } from "./register/registration.dto"
// export { RegistrationFeeDto } from "./register/registration-fee.dto"
// export { RegistrationSlotDto } from "./register/registration-slot.dto"
// export { SearchPlayersDto } from "./register/search-players.dto"

// Re-export types for backward compatibility
export * from "./types"

// Re-export functions for backward compatibility
export {
	AgeResult,
	AgeValue,
	calculateStartingHole,
	calculateTeeTime,
	formatTime,
	getAge,
	getFullName,
	getGroup,
	getStart,
	parseTeeTimeSplits,
	parseTime,
} from "./functions"

// Re-export mappers for backward compatibility
export { toEventDto, toHoleDto, toPlayerDto, toRegistrationSlotDto } from "./types/register/mappers"
