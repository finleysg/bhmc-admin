import { expect, test } from "vitest"

import { renderRoute, screen, setupAuthenticatedUser } from "../../../test/test-utils"

test("renders all four member cards", async () => {
	setupAuthenticatedUser()
	renderRoute("/member")

	expect(await screen.findByText("Account")).toBeVisible()
	expect(screen.getByText("Friends")).toBeVisible()
	expect(screen.getByText("Scores")).toBeVisible()
	expect(screen.getByText("Results")).toBeVisible()
})

test("renders profile header with player name", async () => {
	setupAuthenticatedUser()
	renderRoute("/member")

	// Player name from test data builder (first_name + last_name)
	await screen.findByRole("heading", { level: 3 })
	expect(screen.getByRole("button", { name: /edit profile photo/i })).toBeVisible()
})

test("cards navigate to correct routes", async () => {
	setupAuthenticatedUser()
	renderRoute("/member")

	await screen.findByText("Account")

	const links = screen.getAllByText("Open")
	const hrefs = links.map((link) => link.getAttribute("href"))

	expect(hrefs).toContain("/member/account")
	expect(hrefs).toContain("/member/friends")
	expect(hrefs).toContain("/member/results")
	expect(hrefs).toContain("/member/scores")
})

test("card descriptions are visible", async () => {
	setupAuthenticatedUser()
	renderRoute("/member")

	await screen.findByText("Account")

	expect(screen.getByText("Manage your account information and change your password")).toBeVisible()
	expect(screen.getByText("View and manage your friends list")).toBeVisible()
	expect(
		screen.getByText("View your scoring history and download your scores to Excel"),
	).toBeVisible()
	expect(
		screen.getByText("Check your tournament results, season long points, and skins"),
	).toBeVisible()
})
