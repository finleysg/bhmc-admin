import { EventResultsReportRow } from "./event-results-report-row"
import { EventResultsSection } from "./event-results-section"

export interface EventResultsReport {
	eventName: string
	sections: EventResultsSection[]
	emptyRow: EventResultsReportRow
}
