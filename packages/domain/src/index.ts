// Score DTO exports
export { CreateScorecardDto } from "./scores/create-scorecard.dto"
export { UpdateScorecardDto } from "./scores/update-scorecard.dto"
export { CreateScoreDto } from "./scores/create-score.dto"
export { UpdateScoreDto } from "./scores/update-score.dto"

// Course DTO exports
export { CourseDto } from "./courses/course.dto"
export { TeeDto } from "./courses/tee.dto"
export { HoleDto } from "./courses/hole.dto"

// Event DTO exports
export { EventDto } from "./events/event.dto"
export { EventFeeDto, FeeTypeDto } from "./events/event-fee.dto"
export { EventPlayerFeeDto } from "./events/event-player-fee.dto"
export { EventPlayerSlotDto } from "./events/event-player-slot.dto"
export { EventRegistrationSummaryDto } from "./events/event-registration-summary.dto"

// Golf Genius DTO exports
export { IntegrationActionName, IntegrationLogDto } from "./golf-genius/integration-log.dto"
export { ProgressEventDto } from "./golf-genius/progress-event.dto"
export { ProgressTournamentDto } from "./golf-genius/progress-tournament.dto"
export { TournamentData } from "./golf-genius/tournament-data.dto"
export { PlayerMap, PlayerRecord } from "./golf-genius/player-map.dto"
export { PreparedTournamentPoints } from "./golf-genius/tournament-points.dto"
export { PreparedTournamentResult } from "./golf-genius/tournament-result.dto"

// Reports DTO exports
export { EventReportRowDto } from "./reports/event-report-row.dto"
export { EventReportQueryDto } from "./reports/event-report-query.dto"
export { FinanceReportDto } from "./reports/finance-report.dto"
export { PointsReportRowDto } from "./reports/points-report-row.dto"
export { EventResultsReportDto } from "./reports/event-results-report.dto"
export { EventResultsSectionDto } from "./reports/event-results-section.dto"
export { EventResultsReportRowDto } from "./reports/event-results-report-row.dto"

// Registration DTO exports
export {
	AddAdminRegistrationDto,
	AddAdminRegistrationSlotsDto,
} from "./register/admin-registration.dto"
export { PlayerDto } from "./register/player.dto"
export { RegistrationDto } from "./register/registration.dto"
export { RegistrationFeeDto } from "./register/registration-fee.dto"
export { RegistrationSlotDto } from "./register/registration-slot.dto"
export { SearchPlayersDto } from "./register/search-players.dto"
