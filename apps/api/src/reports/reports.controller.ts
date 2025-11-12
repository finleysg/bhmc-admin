import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common"
import { EventReportQueryDto } from "@repo/dto"

import { ReportsService } from "./reports.service"

@Controller("reports")
export class ReportsController {
	constructor(private readonly reports: ReportsService) {}

	@Get(":season/membership")
	async getMembershipReport(@Param("season", ParseIntPipe) season: number) {
		return this.reports.getMembershipReport(season)
	}

	@Get("events/:eventId/event-report")
	async getEventReport(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Query() query: EventReportQueryDto,
	) {
		return this.reports.getEventReport(eventId, query)
	}

	@Get("events/:eventId/points")
	async getPointsReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getPointsReport(eventId)
	}

	@Get("events/:eventId/financials")
	async getFinanceReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getFinanceReport(eventId)
	}

	@Get("events/:eventId/results")
	async getResultsReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getResultsReport(eventId)
	}
}
