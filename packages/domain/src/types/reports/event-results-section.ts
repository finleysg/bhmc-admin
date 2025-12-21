import { EventResultsReportRow } from "./event-results-report-row"

export type EventResultsSection =
	| {
			type: "stroke"
			header: string
			subSections: Array<{
				header: string
				rows: EventResultsReportRow[]
			}>
	  }
	| {
			type: "skins"
			header: string
			subSections: Array<{
				header: string
				rows: EventResultsReportRow[]
			}>
	  }
	| {
			type: "proxies"
			header: string
			rows: EventResultsReportRow[]
	  }
