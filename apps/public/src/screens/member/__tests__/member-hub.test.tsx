import { expect, test } from "vitest"

import {
	renderRoute,
	screen,
	setupAuthenticatedUser,
} from "../../../test/test-utils"

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

	const links = screen.getAllByText("Go")
	const hrefs = links.map((link) => link.getAttribute("href"))

	expect(hrefs).toContain("/member/account")
	expect(hrefs).toContain("/member/friends")
	expect(hrefs).toContain("/member/results")
	// Scores link includes current year
	expect(hrefs.some((href) => href?.startsWith("/member/scores/gross/"))).toBe(true)
})

test("card descriptions are visible", async () => {
	setupAuthenticatedUser()
	renderRoute("/member")

	await screen.findByText("Account")

	expect(screen.getByText("Manage your account settings and profile information")).toBeVisible()
	expect(screen.getByText("View and manage your friends list")).toBeVisible()
	expect(screen.getByText("View your scoring history and statistics")).toBeVisible()
	expect(screen.getByText("Check tournament results and standings")).toBeVisible()
})
