import { GgAggregate, GgMemberCard, GgScope, GgTournamentResult } from "../api-data"

/**
 * Base parser with common validation and extraction logic
 */
export class BaseResultParser {
	static validateResponse(ggResults: GgTournamentResult): string | null {
		if (!ggResults) {
			return "Invalid or empty results data from Golf Genius"
		}
		if (!ggResults.scopes) {
			return "No scopes found in results data"
		}
		return null
	}

	static extractScopes(ggResults: GgTournamentResult): GgScope[] {
		return ggResults.scopes || []
	}

	static extractAggregates(scope: GgScope): GgAggregate[] {
		return scope.aggregates || []
	}

	static extractMemberCards(aggregate: GgAggregate): GgMemberCard[] {
		return aggregate.member_cards || []
	}

	static extractFlightName(scope: GgScope, defaultValue = ""): string {
		return scope.name || defaultValue
	}
}

/**
 * Parser for points tournament results
 */
export class PointsResultParser extends BaseResultParser {
	static parsePlayerData<
		T extends {
			rank?: string | null
			points?: string | null
			position?: string | null
			total?: string | null
			name?: string | null
		},
	>(aggregate: T, memberCard: GgMemberCard) {
		return {
			rank: aggregate.rank || "",
			points: aggregate.points || "",
			position: aggregate.position || "",
			total: aggregate.total || "",
			memberId: memberCard.member_id_str,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}

	static formatPositionDetails(positionText: string): string {
		if (!positionText) return "No points awarded"

		if (positionText.startsWith("T")) {
			const tiePosition = parseInt(positionText.substring(1), 10)
			if (isNaN(tiePosition) || tiePosition <= 0) return "No points awarded"
			const ordinal = this.getOrdinalSuffix(tiePosition)
			return `Tied for ${tiePosition}${ordinal} place points`
		} else {
			const posNum = parseInt(positionText, 10)
			if (isNaN(posNum) || posNum <= 0) return "No points awarded"
			const ordinal = this.getOrdinalSuffix(posNum)
			return `${posNum}${ordinal} place points`
		}
	}

	private static getOrdinalSuffix(num: number): string {
		if (num >= 11 && num <= 13) return "th"
		const lastDigit = num % 10
		switch (lastDigit) {
			case 1:
				return "st"
			case 2:
				return "nd"
			case 3:
				return "rd"
			default:
				return "th"
		}
	}
}

/**
 * Parser for skins tournament results (saves to events_tournamentresult)
 */
export class SkinsResultParser extends BaseResultParser {
	static parsePlayerData<
		T extends {
			purse?: string | null
			total?: string | null
			details?: string | null
			name?: string | null
		},
	>(aggregate: T, memberCard: GgMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			total: aggregate.total || "",
			details: aggregate.details || null,
			memberId: memberCard.member_id_str,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for proxy/user-scored tournament results (saves to events_tournamentresult)
 */
export class ProxyResultParser extends BaseResultParser {
	static parsePlayerData<
		T extends { purse?: string | null; rank?: string | null; name?: string | null },
	>(aggregate: T, memberCard: GgMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			rank: aggregate.rank || "",
			memberId: memberCard.member_id_str,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for stroke play tournament results (saves to events_tournamentresult)
 */
export class StrokePlayResultParser extends BaseResultParser {
	static parsePlayerData<
		T extends {
			purse?: string | null
			position?: string | null
			total?: string | null
			name?: string | null
		},
	>(aggregate: T, memberCard: GgMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			position: aggregate.position || "",
			total: aggregate.total || "",
			memberId: memberCard.member_id_str,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for quota tournament results (saves to events_tournamentresult)
 */
export class QuotaResultParser extends BaseResultParser {
	static parsePlayerData<
		T extends {
			purse?: string | null
			position?: string | null
			total?: string | null
			score?: string | null
			name?: string | null
		},
	>(aggregate: T, memberCard: GgMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			position: aggregate.position || "",
			total: aggregate.total || "",
			score: aggregate.score || "",
			memberId: memberCard.member_id_str,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

export class TeamResultParser {
	static validateResponse(ggResults: GgTournamentResult): string | null {
		if (!ggResults.scopes?.length) {
			return "Invalid response: No scopes found"
		}
		// Check for team indicators (e.g., first aggregate has multiple members or individual_results)
		const firstScope = ggResults.scopes[0]
		if (!firstScope.aggregates?.length) {
			return "Invalid response: No aggregates found"
		}
		const firstAggregate = firstScope.aggregates[0]
		if (firstAggregate.member_ids?.length <= 1 && !firstAggregate.individual_results) {
			return "Response does not appear to be team format"
		}
		return null
	}

	static extractScopes(ggResults: GgTournamentResult): GgScope[] {
		return ggResults.scopes || []
	}

	static extractFlightName(scope: GgScope): string {
		return scope.name || "Not flighted"
	}

	static extractAggregates(scope: GgScope): GgAggregate[] {
		return scope.aggregates || []
	}

	static extractMemberCards(aggregate: GgAggregate): GgMemberCard[] {
		return aggregate.member_cards || []
	}

	// Parse per-player data from individual_results (team-specific)
	static parseTeamPlayerData(
		aggregate: GgAggregate,
		memberId: string,
	): { name: string; total: number | null; purse: string } | null {
		const indiv = aggregate.individual_results?.find((ir) => ir.member_id_str === memberId)
		if (!indiv) {
			return null
		}
		return {
			name: indiv.name,
			total: indiv.totals?.net_scores?.total || null,
			purse: aggregate.purse || "", // Team purse applies per player
		}
	}
}
