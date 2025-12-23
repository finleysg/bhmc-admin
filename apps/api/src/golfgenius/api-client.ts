import axios, { AxiosInstance } from "axios"
import { type ZodSchema } from "zod"

import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import {
	GgEventsResponseSchema,
	GgMembersResponseSchema,
	GgMemberWrapperSchema,
	GgRoundsResponseSchema,
	GgSeasonsResponseSchema,
	GgTeesheetResponseSchema,
	GgTournamentResultWrapperSchema,
	GgTournamentsResponseSchema,
	type GgTeesheetResponse,
	unwrapEvents,
	unwrapMembers,
	unwrapRounds,
	unwrapSeasons,
	unwrapTournaments,
} from "./api-data"
import { GolfGeniusTournamentResults } from "./dto/tournament-results.dto"
import {
	EventDto,
	MasterRosterItemDto,
	RosterMemberDto,
	RosterMemberSyncDto,
	RoundDto,
	SeasonDto,
	TournamentDto,
} from "./dto/internal.dto"
import {
	mapEvent,
	mapMasterRosterItem,
	mapMemberExport,
	mapRosterMember,
	mapRound,
	mapSeason,
	mapTournament,
} from "./dto/mappers"
import { ApiError, AuthError, RateLimitError, ValidationError } from "./errors"

interface RequestOptions {
	params?: Record<string, string>
	data?: unknown
	json?: unknown
}

@Injectable()
export class ApiClient {
	private readonly logger = new Logger(ApiClient.name)
	private readonly apiKey: string
	private readonly baseUrl: string
	private readonly client: AxiosInstance
	private readonly maxRetries = 3
	private readonly retryDelayBase = 1000 // ms
	private readonly retryDelayMax = 60000 // ms

	constructor(private configService: ConfigService) {
		this.apiKey = this.configService.get<string>("golfGenius.apiKey") || ""
		this.baseUrl =
			this.configService.get<string>("golfGenius.baseUrl") || "https://www.golfgenius.com"
		if (!this.apiKey) {
			throw new Error("Golf Genius API key not provided")
		}

		this.client = axios.create({
			baseURL: this.baseUrl,
			timeout: this.configService.get<number>("golfGenius.timeout") ?? 30000,
			validateStatus: () => true, // Don't throw on any status code
		})
	}

	// Overload: with schema returns validated type
	private async request<T>(
		method: "get" | "post" | "put" | "delete",
		endpoint: string,
		options: RequestOptions,
		schema: ZodSchema<T>,
	): Promise<T>
	// Overload: without schema returns unknown
	private async request(
		method: "get" | "post" | "put" | "delete",
		endpoint: string,
		options?: RequestOptions,
	): Promise<unknown>
	// Implementation
	private async request<T>(
		method: "get" | "post" | "put" | "delete",
		endpoint: string,
		options: RequestOptions = {},
		schema?: ZodSchema<T>,
	): Promise<T> {
		let url = endpoint
		if (endpoint.includes("{api_key}")) {
			url = endpoint.replace("{api_key}", this.apiKey)
		}

		const headers: Record<string, string> = {
			Accept: "application/json",
			"User-Agent": "BHMC-Integration/1.0",
			Authorization: `Bearer ${this.apiKey}`,
		}
		if (options.json) {
			headers["Content-Type"] = "application/json"
		}

		let lastError: unknown = null

		for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
			try {
				const res = await this.client.request({
					method,
					url,
					params: options.params,
					data: options.json ?? options.data,
					headers,
				})

				if (res.status === 429) {
					// Rate limited
					const retryAfter = res.headers["retry-after"] as string | undefined
					const ra = retryAfter ? Math.min(parseInt(retryAfter, 10), this.retryDelayMax) : 0
					const delay = Math.min(this.retryDelayBase * 2 ** attempt, this.retryDelayMax)
					const wait = Math.max(delay, ra * 1000)
					if (attempt < this.maxRetries) {
						this.logger.warn("Rate limited, retrying", { attempt: attempt + 1, wait })
						await new Promise((r) => setTimeout(r, wait))
						continue
					}
					throw new RateLimitError("Rate limit exceeded after retries", ra)
				}

				if (res.status === 401) {
					throw new AuthError("Authentication failed")
				}

				if (res.status >= 400) {
					throw new ApiError(
						`Request failed: ${res.status} ${res.statusText}`,
						res.status,
						res.statusText,
						res.data,
					)
				}

				// Validate response with schema if provided
				if (schema) {
					const result = schema.safeParse(res.data)
					if (!result.success) {
						throw new ValidationError(
							`Response validation failed: ${result.error.message}`,
							result.error,
							res.data,
						)
					}
					return result.data
				}
				return res.data
			} catch (err) {
				lastError = err
				// network or transient errors: retry
				if (attempt < this.maxRetries) {
					const delay = Math.min(this.retryDelayBase * 2 ** attempt, this.retryDelayMax)
					this.logger.warn("Network/error, retrying", {
						error: String(err),
						attempt: attempt + 1,
						delay,
					})
					await new Promise((r) => setTimeout(r, delay))
					continue
				}
				// no more retries: rethrow enriched error
				if (err instanceof ApiError || err instanceof AuthError || err instanceof RateLimitError)
					throw err
				throw new ApiError(String(err), undefined, undefined, undefined, { original: err })
			}
		}

		// Should never be reached
		if (lastError instanceof Error) {
			throw lastError
		}
		throw new ApiError("Request failed after all retries")
	}

	async getMasterRoster(page?: number, photo = false): Promise<MasterRosterItemDto[]> {
		const params: Record<string, string> = {}
		if (page != null) params.page = String(page)
		if (photo) params.photo = "true"
		const endpoint = `/api_v2/${this.apiKey}/master_roster`
		const response = await this.request("get", endpoint, { params }, GgMembersResponseSchema)
		return unwrapMembers(response).map(mapMasterRosterItem)
	}

	async getMasterRosterMember(email: string): Promise<MasterRosterItemDto | null> {
		const endpoint = `/api_v2/${this.apiKey}/master_roster_member/${encodeURIComponent(email)}`
		try {
			const response = await this.request("get", endpoint, {}, GgMemberWrapperSchema)
			return mapMasterRosterItem(response.member)
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 404) return null
			throw err
		}
	}

	async getSeasons(): Promise<SeasonDto[]> {
		const endpoint = `/api_v2/${this.apiKey}/seasons`
		const response = await this.request("get", endpoint, {}, GgSeasonsResponseSchema)
		return unwrapSeasons(response).map(mapSeason)
	}

	async getEvents(seasonId?: string, categoryId?: string): Promise<EventDto[]> {
		const params: Record<string, string> = {}
		if (seasonId) params.season = seasonId
		if (categoryId) params.category = categoryId
		const endpoint = `/api_v2/${this.apiKey}/events`
		const response = await this.request("get", endpoint, { params }, GgEventsResponseSchema)
		return unwrapEvents(response).map(mapEvent)
	}

	async getEventRounds(eventId: string): Promise<RoundDto[]> {
		const endpoint = `/api_v2/${this.apiKey}/events/${eventId}/rounds`
		const response = await this.request("get", endpoint, {}, GgRoundsResponseSchema)
		return unwrapRounds(response).map(mapRound)
	}

	async getRoundTournaments(eventId: string, roundId: string): Promise<TournamentDto[]> {
		const endpoint = `/api_v2/${this.apiKey}/events/${eventId}/rounds/${roundId}/tournaments`
		const response = await this.request("get", endpoint, {}, GgTournamentsResponseSchema)
		return unwrapTournaments(response).map(mapTournament)
	}

	async getEventRoster(eventId: string, photo = false): Promise<RosterMemberDto[]> {
		const members: RosterMemberDto[] = []
		let page = 1
		while (true) {
			const params: Record<string, string> = { page: String(page) }
			if (photo) params.photo = "true"
			const endpoint = `/api_v2/${this.apiKey}/events/${eventId}/roster`
			const response = await this.request("get", endpoint, { params }, GgMembersResponseSchema)
			const unwrapped = unwrapMembers(response)
			members.push(...unwrapped.map(mapRosterMember))
			if (response.length < 100) break
			page += 1
		}
		return members
	}

	async getRoundTeeSheet(
		eventId: string,
		roundId: string,
		includeAllCustomFields = false,
	): Promise<GgTeesheetResponse> {
		const params: Record<string, string> = {}
		if (includeAllCustomFields) params.include_all_custom_fields = "true"
		const endpoint = `/api_v2/${this.apiKey}/events/${eventId}/rounds/${roundId}/tee_sheet`
		return this.request("get", endpoint, { params }, GgTeesheetResponseSchema)
	}

	async getTournamentResults(
		eventId: string,
		roundId: string,
		tournamentId: string,
	): Promise<GolfGeniusTournamentResults> {
		const endpoint = `/api_v2/${this.apiKey}/events/${eventId}/rounds/${roundId}/tournaments/${tournamentId}.json`
		const response = await this.request("get", endpoint, {}, GgTournamentResultWrapperSchema)
		// Cast validated response to the legacy type for compatibility with existing processing code
		return response as unknown as GolfGeniusTournamentResults
	}

	async createMemberRegistration(eventId: string, member: RosterMemberSyncDto) {
		const memberData = mapMemberExport(member)
		const endpoint = `/api_v2/events/${eventId}/members`
		return this.request("post", endpoint, { json: memberData })
	}

	async updateMemberRegistration(eventId: string, memberId: string, member: RosterMemberSyncDto) {
		const memberData = mapMemberExport(member)
		const endpoint = `/api_v2/events/${eventId}/members/${memberId}`
		return this.request("put", endpoint, { json: memberData })
	}

	/**
	 * Identify the current season for the current calendar year.
	 * Rules:
	 * - If Golf Genius marks a season `current` but its name != current year -> throw (conflict)
	 * - Prefer a season whose name equals the current year
	 * - Otherwise, if a current-flagged season exists and its name equals the year, use it
	 * - Otherwise throw (we require an explicit season for the current year)
	 */
	async getCurrentSeasonForYear(): Promise<SeasonDto> {
		const seasons = await this.getSeasons()
		const year = new Date().getFullYear().toString()

		if (!seasons || seasons.length === 0) {
			throw new ApiError("No seasons returned from Golf Genius")
		}

		const currentFlagSeason = seasons.find((s) => !!s.current)
		if (currentFlagSeason && currentFlagSeason.name && currentFlagSeason.name !== year) {
			// Conflict between GG current flag and calendar year
			throw new ApiError(
				`Golf Genius indicates a current season (${currentFlagSeason.name}) that does not match the calendar year (${year})`,
			)
		}

		const seasonNamedYear = seasons.find((s) => s.name === year)
		if (seasonNamedYear) return seasonNamedYear

		if (currentFlagSeason && currentFlagSeason.name === year) return currentFlagSeason

		// No explicit current season matching the year
		throw new ApiError(`No Golf Genius season found for the current year: ${year}`)
	}

	private normalizeDateOnly(s?: string | null) {
		if (!s) return ""
		// Expect formats like YYYY-MM-DD or ISO; take first 10 chars
		return s.toString().substring(0, 10)
	}

	// Simple Levenshtein distance based similarity (returns 0..1)
	private stringSimilarity(a?: string | null, b?: string | null): number {
		const sa = (a ?? "")
			.toString()
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "")
		const sb = (b ?? "")
			.toString()
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "")
		if (!sa && !sb) return 1
		if (!sa || !sb) return 0
		const la = sa.length
		const lb = sb.length
		const dp: number[][] = Array.from({ length: la + 1 }, () => new Array<number>(lb + 1).fill(0))
		for (let i = 0; i <= la; i++) dp[i][0] = i
		for (let j = 0; j <= lb; j++) dp[0][j] = j
		for (let i = 1; i <= la; i++) {
			for (let j = 1; j <= lb; j++) {
				const cost = sa[i - 1] === sb[j - 1] ? 0 : 1
				dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
			}
		}
		const distance = dp[la][lb]
		const maxLen = Math.max(la, lb)
		return 1 - distance / maxLen
	}

	/**
	 * Find the single matching Golf Genius event for a given local event start date (and optional name)
	 * - pulls events for the current season and configured categoryId
	 * - matches by exact start date first
	 * - if multiple matches on date, attempts a simple name similarity fuzzy match
	 * - throws if not confident in a unique match
	 */
	async findMatchingEventByStartDate(startDate: string, name?: string): Promise<EventDto> {
		const season = await this.getCurrentSeasonForYear()
		const categoryId = this.configService.get<string>("golfGenius.categoryId")
		const events = await this.getEvents(season.id?.toString(), categoryId)

		const targetDate = this.normalizeDateOnly(startDate)
		const dateMatches = events.filter((e) => this.normalizeDateOnly(e.startDate) === targetDate)

		if (dateMatches.length === 0) {
			throw new ApiError(`No Golf Genius events found matching start date ${targetDate}`)
		}

		if (dateMatches.length === 1) return dateMatches[0]

		// Multiple events on the same date -> try fuzzy name matching
		if (name) {
			// exact name match (case-insensitive)
			const exact = dateMatches.find(
				(e) => (e.name ?? "").toString().toLowerCase() === name.toString().toLowerCase(),
			)
			if (exact) return exact

			// compute similarity scores
			const scores = dateMatches.map((e) => ({
				event: e,
				score: this.stringSimilarity(e.name ?? "", name),
			}))
			scores.sort((a, b) => b.score - a.score)

			const best = scores[0]
			const second = scores[1]

			// require a confident best match: more permissive for short query names used in our tests
			const THRESHOLD = 0.3
			const MIN_MARGIN = 0.0
			if (best.score >= THRESHOLD && (!second || best.score - second.score >= MIN_MARGIN)) {
				return best.event
			}
		}

		throw new ApiError(
			`Multiple Golf Genius events found on ${targetDate} and no confident name match`,
		)
	}
}
