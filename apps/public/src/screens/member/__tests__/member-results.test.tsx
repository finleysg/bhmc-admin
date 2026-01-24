import { expect, test } from "vitest"
import { addDays, format } from "date-fns"

import {
	renderRoute,
	screen,
	setupAuthenticatedUser,
} from "../../../test/test-utils"
import { http, HttpResponse, server } from "../../../test/test-server"
import { apiUrl } from "../../../utils/api-utils"

const mockTournamentResults = [
	{
		id: 1,
		tournament: 100,
		player: 11,
		team_id: null,
		position: 3,
		score: 82,
		amount: "25.00",
		payout_type: "Credit",
		payout_to: null,
		payout_status: "paid",
		flight: "A",
		summary: "72",
		details: "Skins: 2, 5, 14",
		event_name: "Spring Kickoff",
		event_date: "2025-05-15",
	},
	{
		id: 2,
		tournament: 101,
		player: 11,
		team_id: null,
		position: 1,
		score: 78,
		amount: "50.00",
		payout_type: "Credit",
		payout_to: null,
		payout_status: "confirmed",
		flight: "A",
		summary: "68",
		details: null,
		event_name: "Monthly Medal",
		event_date: "2025-06-10",
	},
]

const mockTournamentPoints = [
	{
		id: 1,
		tournament: 100,
		player: 11,
		position: 5,
		score: 82,
		points: 15,
		details: null,
		create_date: "2025-05-16",
		event_name: "Spring Kickoff",
		event_date: "2025-05-15",
	},
]

const futureDate = addDays(new Date(), 14)
const mockClubEvents = [
	{
		id: 200,
		name: "Summer Championship",
		start_date: format(futureDate, "yyyy-MM-dd"),
		event_type: "W",
		registration_type: "M",
		season: new Date().getFullYear(),
		status: "S",
	},
]

const mockRegistrationSlots = [
	{
		id: 1,
		event: 200,
		player: 11,
		status: "R", // Reserved
		starting_order: 1,
		slot: 1,
	},
]

function setupResultsHandlers(options: {
	results?: typeof mockTournamentResults
	points?: typeof mockTournamentPoints
	events?: typeof mockClubEvents
	registrations?: typeof mockRegistrationSlots
} = {}) {
	const {
		results = mockTournamentResults,
		points = mockTournamentPoints,
		events = mockClubEvents,
		registrations = mockRegistrationSlots,
	} = options

	server.use(
		http.get(apiUrl("tournament-results"), () => {
			return HttpResponse.json(results)
		}),
		http.get(apiUrl("tournament-points"), () => {
			return HttpResponse.json(points)
		}),
		http.get(apiUrl("events"), () => {
			return HttpResponse.json(events)
		}),
		http.get(apiUrl("registration-slots"), () => {
			return HttpResponse.json(registrations)
		}),
	)
}

test("displays completed event results", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers()
	renderRoute("/member/results")

	// Wait for results to load
	expect(await screen.findByText("Spring Kickoff")).toBeVisible()
	expect(screen.getByText("Monthly Medal")).toBeVisible()
})

test("displays scores and points for completed events", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers()
	renderRoute("/member/results")

	await screen.findByText("Spring Kickoff")

	// Check scores displayed
	expect(screen.getByText("Scores")).toBeVisible()
	expect(screen.getByText("82")).toBeVisible() // Gross score
	expect(screen.getByText("72")).toBeVisible() // Net score (summary)

	// Check points displayed
	expect(screen.getByText("Points Earned:")).toBeVisible()
	expect(screen.getByText("15")).toBeVisible()
})

test("displays payout status badge", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers()
	renderRoute("/member/results")

	await screen.findByText("Spring Kickoff")

	expect(screen.getByText("Paid")).toBeVisible()
	expect(screen.getByText("Confirmed")).toBeVisible()
})

test("displays pending event with Registered badge", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers()
	renderRoute("/member/results")

	await screen.findByText("Summer Championship")

	expect(screen.getByText("Registered")).toBeVisible()
	expect(screen.getByText("Waiting for results")).toBeVisible()
})

test("displays empty state when no results", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers({ results: [], points: [], events: [], registrations: [] })
	renderRoute("/member/results")

	expect(
		await screen.findByText("No results or upcoming events for this season.")
	).toBeVisible()
})

test("renders season filter select", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers()
	renderRoute("/member/results")

	await screen.findByText("Spring Kickoff")

	expect(screen.getByLabelText("Season")).toBeVisible()
	expect(screen.getByRole("combobox")).toBeVisible()
})

test("displays page title", async () => {
	setupAuthenticatedUser()
	setupResultsHandlers()
	renderRoute("/member/results")

	expect(await screen.findByRole("heading", { name: "My Results" })).toBeVisible()
})
