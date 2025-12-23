import { and, asc, eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"
import { Champion, LowScore } from "@repo/domain/types"

import {
	champion,
	DrizzleService,
	lowScore,
	type ChampionInsert,
	type ChampionRow,
	type LowScoreInsert,
	type LowScoreRow,
} from "../database"
import { toChampion, toLowScore } from "./mappers"

@Injectable()
export class CoreRepository {
	constructor(private drizzle: DrizzleService) {}

	async findLowScores(season: number, courseName: string, isNet: boolean): Promise<LowScore[]> {
		const results = await this.drizzle.db
			.select()
			.from(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
				),
			)
			.orderBy(asc(lowScore.score))
		return results.map((row) => toLowScore(row))
	}

	async findLowScoreRows(
		season: number,
		courseName: string,
		isNet: boolean,
	): Promise<LowScoreRow[]> {
		return this.drizzle.db
			.select()
			.from(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
				),
			)
			.orderBy(asc(lowScore.score))
	}

	async createLowScore(data: LowScoreInsert): Promise<LowScore> {
		const [result] = await this.drizzle.db.insert(lowScore).values(data)
		return this.findLowScoreById(Number(result.insertId))
	}

	async findLowScoreById(id: number): Promise<LowScore> {
		const [row] = await this.drizzle.db
			.select()
			.from(lowScore)
			.where(eq(lowScore.id, id))
			.limit(1)
		if (!row) {
			throw new Error(`No low score found for id ${id}.`)
		}
		return toLowScore(row)
	}

	async deleteLowScores(season: number, courseName: string, isNet: boolean): Promise<void> {
		await this.drizzle.db
			.delete(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
				),
			)
	}

	async existsLowScore(
		season: number,
		courseName: string,
		isNet: boolean,
		playerId: number,
	): Promise<boolean> {
		const existing = await this.drizzle.db
			.select({ id: lowScore.id })
			.from(lowScore)
			.where(
				and(
					eq(lowScore.season, season),
					eq(lowScore.courseName, courseName),
					eq(lowScore.isNet, isNet ? 1 : 0),
					eq(lowScore.playerId, playerId),
				),
			)
			.limit(1)
		return existing.length > 0
	}

	async findChampionById(id: number): Promise<Champion> {
		const [row] = await this.drizzle.db
			.select()
			.from(champion)
			.where(eq(champion.id, id))
			.limit(1)
		if (!row) {
			throw new Error(`No champion found for id ${id}.`)
		}
		return toChampion(row)
	}

	async findChampions(eventId: number): Promise<Champion[]> {
		const results = await this.drizzle.db
			.select()
			.from(champion)
			.where(eq(champion.eventId, eventId))
			.orderBy(asc(champion.flight), asc(champion.score))
		return results.map((row) => toChampion(row))
	}

	async findChampionRows(eventId: number): Promise<ChampionRow[]> {
		return this.drizzle.db
			.select()
			.from(champion)
			.where(eq(champion.eventId, eventId))
			.orderBy(asc(champion.flight), asc(champion.score))
	}

	async createChampion(data: ChampionInsert): Promise<Champion> {
		const [result] = await this.drizzle.db.insert(champion).values(data)
		return this.findChampionById(Number(result.insertId))
	}

	async deleteChampions(eventId: number): Promise<void> {
		await this.drizzle.db.delete(champion).where(eq(champion.eventId, eventId))
	}
}
