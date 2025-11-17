// Score DTO exports
export { CreateScorecardDto } from "./scores/create-scorecard.dto"
export { UpdateScorecardDto } from "./scores/update-scorecard.dto"
export { CreateScoreDto } from "./scores/create-score.dto"
export { UpdateScoreDto } from "./scores/update-score.dto"
export type { ScoreDto } from "./scores/score.dto"
export type { ScorecardDto } from "./scores/scorecard.dto"

// Course DTO exports
export type { CourseDto } from "./courses/course.dto"
export type { TeeDto } from "./courses/tee.dto"
export type { HoleDto } from "./courses/hole.dto"

// Event DTO exports
export type { EventDto } from "./events/event.dto"
export type { EventFeeDto, FeeTypeDto } from "./events/event-fee.dto"
export type { RoundDto } from "./events/round.dto"
export type { TournamentDto } from "./events/tournament.dto"
export { EventPlayerFeeDto } from "./events/event-player-fee.dto"
export { EventPlayerSlotDto } from "./events/event-player-slot.dto"
export { EventRegistrationSummaryDto } from "./events/event-registration-summary.dto"

// Golf Genius DTO exports
export type { IntegrationActionName, IntegrationLogDto } from "./golf-genius/integration-log.dto"
export type { ProgressEventDto } from "./golf-genius/progress-event.dto"
export type { ProgressTournamentDto } from "./golf-genius/progress-tournament.dto"
export type { TournamentData } from "./golf-genius/tournament-data.dto"
export type { PlayerMap, PlayerRecord } from "./golf-genius/player-map.dto"
export type { PreparedTournamentPoints } from "./golf-genius/tournament-points.dto"
export type { PreparedTournamentResult } from "./golf-genius/tournament-result.dto"

// Reports DTO exports
export type { EventReportRowDto } from "./reports/event-report-row.dto"
export { EventReportQueryDto } from "./reports/event-report-query.dto"
export type { FinanceReportDto } from "./reports/finance-report.dto"
export type { PointsReportRowDto } from "./reports/points-report-row.dto"
export type { EventResultsReportDto } from "./reports/event-results-report.dto"
export type { EventResultsSectionDto } from "./reports/event-results-section.dto"
export type { EventResultsReportRowDto } from "./reports/event-results-report-row.dto"

// Registration DTO exports
export type {
	AddAdminRegistrationDto,
	AddAdminRegistrationSlotsDto,
} from "./register/admin-registration.dto"
export type { PlayerDto } from "./register/player.dto"
export type { RegistrationDto } from "./register/registration.dto"
export type { RegistrationFeeDto } from "./register/registration-fee.dto"
export type { RegistrationSlotDto } from "./register/registration-slot.dto"
export type { SearchPlayersDto } from "./register/search-players.dto"
export type { PaymentDto } from "./register/payment.dto"
export type { RefundDto } from "./register/refund.dto"
