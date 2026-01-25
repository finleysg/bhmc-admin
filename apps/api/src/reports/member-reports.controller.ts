import type { Response } from "express"

import { Controller, Get, Inject, Param, ParseIntPipe, Query, Req, Res } from "@nestjs/common"

import type { AuthenticatedRequest } from "../auth"
import type { ScoreType } from "./member-scores.service"
import { MemberScoresService } from "./member-scores.service"

@Controller("reports/member")
export class MemberReportsController {
	constructor(@Inject(MemberScoresService) private readonly memberScores: MemberScoresService) {}

	@Get("scores/:season/export")
	async getScoresExport(
		@Req() req: AuthenticatedRequest,
		@Param("season", ParseIntPipe) season: number,
		@Query("courseIds") courseIdsParam?: string,
		@Query("scoreType") scoreTypeParam?: string,
		@Res() res?: Response,
	) {
		const playerId = req.user.playerId
		const courseIds = courseIdsParam
			? courseIdsParam.split(",").map((id) => parseInt(id, 10))
			: undefined
		const scoreType = (scoreTypeParam || "both") as ScoreType

		const buffer = await this.memberScores.getPlayerScoresExcel(
			playerId,
			season,
			courseIds,
			scoreType,
		)

		res!.setHeader(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		)
		res!.setHeader("Content-Disposition", `attachment; filename="my-scores-${season}.xlsx"`)
		res!.send(buffer)
	}
}
