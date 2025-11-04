import {
	GGAggregate,
	GGMemberCard,
	GGScope,
	GolfGeniusTournamentResults,
} from "../dto/tournament-results.dto"

/**
 * Base parser with common validation and extraction logic
 */
export class BaseResultParser {
	static validateResponse(ggResults: GolfGeniusTournamentResults): string | null {
		if (!ggResults?.event) {
			return "Invalid or empty results data from Golf Genius"
		}
		if (!ggResults.event.scopes) {
			return "No scopes found in results data"
		}
		return null
	}

	static extractScopes(ggResults: GolfGeniusTournamentResults): GGScope[] {
		return ggResults.event.scopes || []
	}

	static extractAggregates(scope: GGScope): GGAggregate[] {
		return scope.aggregates || []
	}

	static extractMemberCards(aggregate: GGAggregate): GGMemberCard[] {
		return aggregate.member_cards || []
	}

	static extractFlightName(scope: GGScope, defaultValue = "N/A"): string {
		return scope.name || defaultValue
	}
}

/**
 * Parser for points tournament results (saves to damcup_eventpoints)
 */
export class PointsResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			rank: aggregate.rank || "",
			points: aggregate.points || "",
			position: aggregate.position || "",
			total: aggregate.total || "",
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
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			total: aggregate.total || "",
			details: aggregate.details || null,
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for proxy/user-scored tournament results (saves to events_tournamentresult)
 */
export class ProxyResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			rank: aggregate.rank || "",
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}

/**
 * Parser for stroke play tournament results (saves to events_tournamentresult)
 */
export class StrokePlayResultParser extends BaseResultParser {
	static parsePlayerData(aggregate: GGAggregate, memberCard: GGMemberCard) {
		return {
			purse: aggregate.purse || "$0.00",
			position: aggregate.position || "",
			total: aggregate.total || "",
			memberCardId: memberCard.member_card_id_str,
			playerName: aggregate.name || "Unknown",
		}
	}
}
