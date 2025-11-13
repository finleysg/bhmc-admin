import { Response } from "express"

import { Controller, Get, Param, ParseIntPipe, Res } from "@nestjs/common"

import { ReportsService } from "./reports.service"

@Controller("reports")
export class ReportsController {
	constructor(private readonly reports: ReportsService) {}

	@Get(":season/membership")
	async getMembershipReport(@Param("season", ParseIntPipe) season: number) {
		return this.reports.getMembershipReport(season)
	}

	@Get("events/:eventId/event-report")
	async getEventReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getEventReport(eventId)
	}

	@Get("events/:eventId/event-report/excel")
	async getEventReportExcel(@Param("eventId", ParseIntPipe) eventId: number, @Res() res: Response) {
		const buffer = await this.reports.generateEventReportExcel(eventId)

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		res.setHeader("Content-Disposition", `attachment; filename="event-report-${eventId}.xlsx"`)
		res.send(buffer)
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
