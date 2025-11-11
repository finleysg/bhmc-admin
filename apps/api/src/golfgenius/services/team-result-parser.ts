import {
	GGAggregate,
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
		const firstAggregate = firstScope.aggregates[0] as GGAggregate
		if (firstAggregate.member_ids?.length <= 1 && !firstAggregate.individual_results) {
			return "Response does not appear to be team format"
		}
		return null
	}

	static extractScopes(ggResults: GolfGeniusTournamentResults): any[] {
		return ggResults.event?.scopes || []
	}

	static extractFlightName(scope: any): string {
		return scope.name || "Not flighted"
	}

	static extractAggregates(scope: any): GGAggregate[] {
		return scope.aggregates || []
	}

	static extractMemberCards(aggregate: GGAggregate): any[] {
		return aggregate.member_cards || []
	}

	// Parse per-player data from individual_results (team-specific)
	static parseTeamPlayerData(aggregate: GGAggregate, memberId: string): { name: string; total: number | null; purse: string } | null {
		const indiv = aggregate.individual_results?.find(ir => ir.member_id_str === memberId)
		if (!indiv) {
			return null
		}
		return {
			name: indiv.name,
			total: indiv.totals?.net_scores?.total || null,
			purse: aggregate.purse || "",  // Team purse applies per player
		}
	}

	// Fallback for non-team (but since dedicated endpoint, assume team)
	static parsePlayerData(aggregate: GGAggregate, memberCard: any): { name: string; position: string; total: string; purse: string } {
		// For completeness, but endpoint assumes team
		return {
			name: aggregate.name || "",
			position: aggregate.position || "",
			total: aggregate.total || "",
			purse: aggregate.purse || "",
		}
	}
}
