import type { Response } from "express"

import { Controller, Get, Inject, Param, ParseIntPipe, Res } from "@nestjs/common"

import { Admin } from "../auth"
import { ReportsService } from "./reports.service"

@Controller("reports")
@Admin()
export class ReportsController {
	constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

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

	@Get("events/:eventId/points/excel")
	async getPointsReportExcel(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Res() res: Response,
	) {
		const buffer = await this.reports.generatePointsReportExcel(eventId)

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		res.setHeader("Content-Disposition", `attachment; filename="points-report-${eventId}.xlsx"`)
		res.send(buffer)
	}

	@Get("events/:eventId/finance")
	async getFinanceReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getFinanceReport(eventId)
	}

	@Get("events/:eventId/finance/excel")
	async getFinanceReportExcel(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Res() res: Response,
	) {
		const buffer = await this.reports.generateFinanceReportExcel(eventId)

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		res.setHeader("Content-Disposition", `attachment; filename="finance-report-${eventId}.xlsx"`)
		res.send(buffer)
	}

	@Get("events/:eventId/results")
	async getResultsReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getResultsReport(eventId)
	}

	@Get("events/:eventId/event-results")
	async getEventResultsReport(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.reports.getEventResultsReport(eventId)
	}

	@Get("events/:eventId/event-results/excel")
	async getEventResultsReportExcel(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Res() res: Response,
	) {
		const buffer = await this.reports.generateEventResultsReportExcel(eventId)

		res.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		res.setHeader("Content-Disposition", `attachment; filename="event-results-${eventId}.xlsx"`)
		res.send(buffer)
	}
}
