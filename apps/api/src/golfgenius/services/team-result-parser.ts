import {
	GGAggregate,
	GGMemberCard,
	GGScope,
	GolfGeniusTournamentResults,
} from "../dto/tournament-results.dto"

export class TeamResultParser {
	static validateResponse(ggResults: GolfGeniusTournamentResults): string | null {
		if (!ggResults.event?.scopes?.length) {
			return "Invalid response: No scopes found"
		}
		// Check for team indicators (e.g., first aggregate has multiple members or individual_results)
		const firstScope = ggResults.event.scopes[0]
		if (!firstScope.aggregates?.length) {
			return "Invalid response: No aggregates found"
		}
		const firstAggregate = firstScope.aggregates[0]
		if (firstAggregate.member_ids?.length <= 1 && !firstAggregate.individual_results) {
			return "Response does not appear to be team format"
		}
		return null
	}

	static extractScopes(ggResults: GolfGeniusTournamentResults): GGScope[] {
		return ggResults.event?.scopes || []
	}

	static extractFlightName(scope: GGScope): string {
		return scope.name || "Not flighted"
	}

	static extractAggregates(scope: GGScope): GGAggregate[] {
		return scope.aggregates || []
	}

	static extractMemberCards(aggregate: GGAggregate): GGMemberCard[] {
		return aggregate.member_cards || []
	}

	// Parse per-player data from individual_results (team-specific)
	static parseTeamPlayerData(
		aggregate: GGAggregate,
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
