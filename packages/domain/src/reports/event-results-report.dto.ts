import { EventResultsReportRowDto } from "./event-results-report-row.dto"
import { EventResultsSectionDto } from "./event-results-section.dto"

export interface EventResultsReportDto {
	eventName: string
	sections: EventResultsSectionDto[]
	emptyRow: EventResultsReportRowDto
}
