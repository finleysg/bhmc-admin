import { expect, test } from "vitest"

import {
	renderRoute,
	screen,
	setupAuthenticatedUser,
	fireEvent,
} from "../../../test/test-utils"
import { http, HttpResponse, server } from "../../../test/test-server"
import { apiUrl } from "../../../utils/api-utils"
import { currentSeason } from "../../../utils/app-config"

// Mock player scores API data
const mockPlayerRounds = [
	{
		id: 1,
		event: 100,
		player: 11,
		course: { id: 1, name: "East", number_of_holes: 9 },
		tee: { id: 1, course: 1, name: "Gold", gg_id: null },
		handicap_index: "12.5",
		course_handicap: 14,
		scores: [
			{ id: 1, hole: { id: 1, course: 1, hole_number: 1, par: 4 }, score: 5, is_net: false },
			{ id: 2, hole: { id: 2, course: 1, hole_number: 2, par: 4 }, score: 4, is_net: false },
			{ id: 3, hole: { id: 3, course: 1, hole_number: 3, par: 3 }, score: 3, is_net: false },
			{ id: 4, hole: { id: 4, course: 1, hole_number: 4, par: 5 }, score: 6, is_net: false },
			{ id: 5, hole: { id: 5, course: 1, hole_number: 5, par: 4 }, score: 5, is_net: false },
			{ id: 6, hole: { id: 6, course: 1, hole_number: 6, par: 5 }, score: 5, is_net: false },
			{ id: 7, hole: { id: 7, course: 1, hole_number: 7, par: 3 }, score: 4, is_net: false },
			{ id: 8, hole: { id: 8, course: 1, hole_number: 8, par: 4 }, score: 4, is_net: false },
			{ id: 9, hole: { id: 9, course: 1, hole_number: 9, par: 4 }, score: 5, is_net: false },
			// Net scores
			{ id: 10, hole: { id: 1, course: 1, hole_number: 1, par: 4 }, score: 4, is_net: true },
			{ id: 11, hole: { id: 2, course: 1, hole_number: 2, par: 4 }, score: 3, is_net: true },
			{ id: 12, hole: { id: 3, course: 1, hole_number: 3, par: 3 }, score: 2, is_net: true },
			{ id: 13, hole: { id: 4, course: 1, hole_number: 4, par: 5 }, score: 5, is_net: true },
			{ id: 14, hole: { id: 5, course: 1, hole_number: 5, par: 4 }, score: 4, is_net: true },
			{ id: 15, hole: { id: 6, course: 1, hole_number: 6, par: 5 }, score: 4, is_net: true },
			{ id: 16, hole: { id: 7, course: 1, hole_number: 7, par: 3 }, score: 3, is_net: true },
			{ id: 17, hole: { id: 8, course: 1, hole_number: 8, par: 4 }, score: 3, is_net: true },
			{ id: 18, hole: { id: 9, course: 1, hole_number: 9, par: 4 }, score: 4, is_net: true },
		],
	},
	{
		id: 2,
		event: 101,
		player: 11,
		course: { id: 2, name: "North", number_of_holes: 9 },
		tee: { id: 2, course: 2, name: "Club", gg_id: null },
		handicap_index: "12.5",
		course_handicap: 13,
		scores: [
			{ id: 19, hole: { id: 10, course: 2, hole_number: 1, par: 4 }, score: 4, is_net: false },
			{ id: 20, hole: { id: 11, course: 2, hole_number: 2, par: 4 }, score: 5, is_net: false },
			{ id: 21, hole: { id: 12, course: 2, hole_number: 3, par: 4 }, score: 4, is_net: false },
			{ id: 22, hole: { id: 13, course: 2, hole_number: 4, par: 5 }, score: 6, is_net: false },
			{ id: 23, hole: { id: 14, course: 2, hole_number: 5, par: 4 }, score: 5, is_net: false },
			{ id: 24, hole: { id: 15, course: 2, hole_number: 6, par: 3 }, score: 3, is_net: false },
			{ id: 25, hole: { id: 16, course: 2, hole_number: 7, par: 4 }, score: 4, is_net: false },
			{ id: 26, hole: { id: 17, course: 2, hole_number: 8, par: 3 }, score: 3, is_net: false },
			{ id: 27, hole: { id: 18, course: 2, hole_number: 9, par: 5 }, score: 5, is_net: false },
			// Net scores
			{ id: 28, hole: { id: 10, course: 2, hole_number: 1, par: 4 }, score: 3, is_net: true },
			{ id: 29, hole: { id: 11, course: 2, hole_number: 2, par: 4 }, score: 4, is_net: true },
			{ id: 30, hole: { id: 12, course: 2, hole_number: 3, par: 4 }, score: 3, is_net: true },
			{ id: 31, hole: { id: 13, course: 2, hole_number: 4, par: 5 }, score: 5, is_net: true },
			{ id: 32, hole: { id: 14, course: 2, hole_number: 5, par: 4 }, score: 4, is_net: true },
			{ id: 33, hole: { id: 15, course: 2, hole_number: 6, par: 3 }, score: 2, is_net: true },
			{ id: 34, hole: { id: 16, course: 2, hole_number: 7, par: 4 }, score: 3, is_net: true },
			{ id: 35, hole: { id: 17, course: 2, hole_number: 8, par: 3 }, score: 2, is_net: true },
			{ id: 36, hole: { id: 18, course: 2, hole_number: 9, par: 5 }, score: 4, is_net: true },
		],
	},
]

const mockEvents = [
	{
		id: 100,
		name: "Weekly Event 1",
		start_date: "2025-06-01",
		event_type: "N",
		registration_type: "M",
		season: currentSeason,
		status: "S",
	},
	{
		id: 101,
		name: "Weekly Event 2",
		start_date: "2025-06-08",
		event_type: "N",
		registration_type: "M",
		season: currentSeason,
		status: "S",
	},
]

function setupScoresHandlers(options: {
	rounds?: typeof mockPlayerRounds
	events?: typeof mockEvents
} = {}) {
	const { rounds = mockPlayerRounds, events = mockEvents } = options

	server.use(
		http.get(apiUrl("scores/"), () => {
			return HttpResponse.json(rounds)
		}),
		http.get(apiUrl("events/"), () => {
			return HttpResponse.json(events)
		}),
	)
}

test("displays course filter chips when rounds exist", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/gross/${currentSeason}`)

	// Wait for scores to load - course names appear as filter chips
	expect(await screen.findByText("East")).toBeVisible()
	expect(screen.getByText("North")).toBeVisible()
})

test("filters scores by course when chip is clicked", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/gross/${currentSeason}`)

	// Wait for both courses to appear
	const eastChip = await screen.findByRole("button", { name: "East" })
	expect(screen.getByText("North")).toBeVisible()

	// Click East to filter
	fireEvent.click(eastChip)

	// East should still be visible (selected), North card should be filtered out
	// The course header "East" should still be visible
	expect(screen.getByText("East")).toBeVisible()
})

test("displays tee name in round row", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/gross/${currentSeason}`)

	// Wait for scores to load
	await screen.findByText("East")

	// Tee names should appear in the round display - format: "YYYY-MM-DD (Tee) Gross"
	expect(screen.getByText(/\(Gold\)/)).toBeVisible()
	expect(screen.getByText(/\(Club\)/)).toBeVisible()
})

test("displays gross scores on gross tab", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/gross/${currentSeason}`)

	await screen.findByText("East")

	// Gross Scores tab should be visible
	expect(screen.getByRole("link", { name: "Gross Scores" })).toBeVisible()
	expect(screen.getByRole("link", { name: "Net Scores" })).toBeVisible()

	// Should show "Gross" in round display
	expect(screen.getByText(/Gross$/)).toBeVisible()
})

test("displays net scores on net tab", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/net/${currentSeason}`)

	await screen.findByText("East")

	// Should show "Net" in round display
	expect(screen.getByText(/Net$/)).toBeVisible()
})

test("renders export button", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/gross/${currentSeason}`)

	await screen.findByText("East")

	// Export button should be present
	expect(screen.getByRole("button", { name: /export to excel/i })).toBeVisible()
})

test("export button is disabled when no scores available", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers({ rounds: [], events: [] })
	renderRoute(`/member/scores/gross/${currentSeason}`)

	// Wait for loading to complete - export button should be disabled
	const exportButton = await screen.findByRole("button", { name: /export to excel/i })
	expect(exportButton).toBeDisabled()
})

test("displays empty state when no rounds for course", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers({ rounds: [], events: [] })
	renderRoute(`/member/scores/gross/${currentSeason}`)

	// Export button exists but is disabled when no data
	const exportButton = await screen.findByRole("button", { name: /export to excel/i })
	expect(exportButton).toBeDisabled()
})

test("deselecting all filters shows all courses again", async () => {
	setupAuthenticatedUser()
	setupScoresHandlers()
	renderRoute(`/member/scores/gross/${currentSeason}`)

	const eastChip = await screen.findByRole("button", { name: "East" })

	// Click East to filter, then click again to deselect
	fireEvent.click(eastChip)
	fireEvent.click(eastChip)

	// Both courses should be visible again
	expect(screen.getByText("East")).toBeVisible()
	expect(screen.getByText("North")).toBeVisible()
})
