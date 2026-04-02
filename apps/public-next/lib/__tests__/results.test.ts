import { groupResultsByEvent } from "../results"
import type { ClubEvent, TournamentPointsData, TournamentResultData } from "../types"

const events: ClubEvent[] = [
	{ id: 10, event_type: "N", name: "Event A", season: 2024, start_date: "2024-06-01", status: "S" },
	{ id: 20, event_type: "N", name: "Event B", season: 2024, start_date: "2024-07-01", status: "S" },
]

const makeTournament = (id: number, eventId: number, isNet: boolean) => ({
	id,
	event: eventId,
	round: null,
	name: isNet ? "Net Tournament" : "Gross Tournament",
	format: null,
	is_net: isNet,
	gg_id: null,
})

describe("groupResultsByEvent", () => {
	it("groups results by event and includes payouts", () => {
		const results: TournamentResultData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 10, false),
				player: 1,
				team_id: null,
				position: 1,
				score: 36,
				amount: "25.00",
				payout_type: "Credit",
				payout_to: "player",
				payout_status: "Pending",
				flight: null,
				summary: null,
				details: null,
			},
		]

		const points: TournamentPointsData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 10, false),
				player: 1,
				position: 1,
				score: 36,
				points: 10,
				details: "1st place",
				create_date: "2024-06-01",
			},
		]

		const summaries = groupResultsByEvent(results, points, events)
		expect(summaries).toHaveLength(1)
		expect(summaries[0].eventName).toBe("Event A")
		expect(summaries[0].grossPoints).toBe(10)
		expect(summaries[0].grossPointsDetails).toBe("1st place")
		expect(summaries[0].payouts).toHaveLength(1)
		expect(summaries[0].payouts[0].amount).toBe(25)
		expect(summaries[0].payouts[0].payoutType).toBe("Credit")
	})

	it("sorts payouts with Credit before Cash", () => {
		const results: TournamentResultData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 10, false),
				player: 1,
				team_id: null,
				position: 1,
				score: 36,
				amount: "10.00",
				payout_type: "Cash",
				payout_to: "player",
				payout_status: "Paid",
				flight: null,
				summary: null,
				details: null,
			},
			{
				id: 2,
				tournament: makeTournament(101, 10, true),
				player: 1,
				team_id: null,
				position: 2,
				score: 34,
				amount: "20.00",
				payout_type: "Credit",
				payout_to: "player",
				payout_status: "Pending",
				flight: null,
				summary: null,
				details: null,
			},
		]

		const summaries = groupResultsByEvent(results, [], events)
		expect(summaries[0].payouts).toHaveLength(2)
		expect(summaries[0].payouts[0].payoutType).toBe("Credit")
		expect(summaries[0].payouts[1].payoutType).toBe("Cash")
	})

	it("returns empty array for undefined results", () => {
		expect(groupResultsByEvent(undefined, undefined, events)).toHaveLength(0)
	})

	it("returns empty array for undefined club events", () => {
		expect(groupResultsByEvent([], [], undefined)).toHaveLength(0)
	})

	it("excludes results with no matching event", () => {
		const results: TournamentResultData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 999, false),
				player: 1,
				team_id: null,
				position: 1,
				score: 36,
				amount: "0.00",
				payout_type: null,
				payout_to: null,
				payout_status: null,
				flight: null,
				summary: null,
				details: null,
			},
		]

		const summaries = groupResultsByEvent(results, [], events)
		expect(summaries).toHaveLength(0)
	})

	it("handles events with no points", () => {
		const results: TournamentResultData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 10, false),
				player: 1,
				team_id: null,
				position: 1,
				score: 36,
				amount: "0.00",
				payout_type: null,
				payout_to: null,
				payout_status: null,
				flight: null,
				summary: null,
				details: null,
			},
		]

		const summaries = groupResultsByEvent(results, [], events)
		expect(summaries).toHaveLength(1)
		expect(summaries[0].grossPoints).toBeNull()
		expect(summaries[0].netPoints).toBeNull()
	})

	it("shows card for event with points but no results", () => {
		const points: TournamentPointsData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 10, false),
				player: 1,
				position: 5,
				score: 42,
				points: 6,
				details: "5th place",
				create_date: "2024-06-01",
			},
			{
				id: 2,
				tournament: makeTournament(101, 10, true),
				player: 1,
				position: 3,
				score: 38,
				points: 8,
				details: "3rd place",
				create_date: "2024-06-01",
			},
		]

		const summaries = groupResultsByEvent([], points, events)
		expect(summaries).toHaveLength(1)
		expect(summaries[0].eventName).toBe("Event A")
		expect(summaries[0].grossScore).toBe(42)
		expect(summaries[0].grossPosition).toBe(5)
		expect(summaries[0].grossPoints).toBe(6)
		expect(summaries[0].grossPointsDetails).toBe("5th place")
		expect(summaries[0].netScore).toBe(38)
		expect(summaries[0].netPosition).toBe(3)
		expect(summaries[0].netPoints).toBe(8)
		expect(summaries[0].netPointsDetails).toBe("3rd place")
		expect(summaries[0].payouts).toHaveLength(0)
	})

	it("sorts summaries by date descending", () => {
		const results: TournamentResultData[] = [
			{
				id: 1,
				tournament: makeTournament(100, 10, false),
				player: 1,
				team_id: null,
				position: 1,
				score: 36,
				amount: "0.00",
				payout_type: null,
				payout_to: null,
				payout_status: null,
				flight: null,
				summary: null,
				details: null,
			},
			{
				id: 2,
				tournament: makeTournament(200, 20, false),
				player: 1,
				team_id: null,
				position: 2,
				score: 38,
				amount: "0.00",
				payout_type: null,
				payout_to: null,
				payout_status: null,
				flight: null,
				summary: null,
				details: null,
			},
		]

		const summaries = groupResultsByEvent(results, [], events)
		expect(summaries[0].eventName).toBe("Event B")
		expect(summaries[1].eventName).toBe("Event A")
	})
})
