/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import type { ServerRegistration } from "../registration/types"

function makeRegistration(overrides: Partial<ServerRegistration> = {}): ServerRegistration {
	return {
		id: 42,
		eventId: 1,
		courseId: 10,
		signedUpBy: "test@example.com",
		expires: "",
		notes: null,
		createdDate: "2026-03-01T00:00:00",
		slots: [
			{
				id: 101,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: {
					id: 1,
					firstName: "Alice",
					lastName: "Smith",
					email: "alice@example.com",
					ghin: null,
					birthDate: null,
					phoneNumber: null,
					tee: null,
					isMember: true,
					lastSeason: null,
				},
				startingOrder: 0,
				slot: 0,
				status: "R",
				fees: [],
			},
			{
				id: 102,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: {
					id: 2,
					firstName: "Bob",
					lastName: "Jones",
					email: "bob@example.com",
					ghin: null,
					birthDate: null,
					phoneNumber: null,
					tee: null,
					isMember: true,
					lastSeason: null,
				},
				startingOrder: 0,
				slot: 1,
				status: "R",
				fees: [],
			},
			{
				id: 103,
				eventId: 1,
				registrationId: 42,
				holeId: 100,
				player: null,
				startingOrder: 0,
				slot: 2,
				status: "A",
				fees: [],
			},
		],
		...overrides,
	}
}

test("renders player names from occupied slots only", async () => {
	const onChange = jest.fn()
	const { RegisteredPlayerSelector } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/components/registered-player-selector"
	)

	render(<RegisteredPlayerSelector registration={makeRegistration()} onChange={onChange} />)

	expect(screen.getByText("Alice Smith")).toBeTruthy()
	expect(screen.getByText("Bob Jones")).toBeTruthy()
	// 2 checkboxes for players + 1 for Select All = 3 checkboxes
	const checkboxes = screen.getAllByRole("checkbox")
	expect(checkboxes.length).toBe(3)
})

test("multi-select: clicking a player checkbox reports selected IDs", async () => {
	const onChange = jest.fn()
	const { RegisteredPlayerSelector } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/components/registered-player-selector"
	)

	render(<RegisteredPlayerSelector registration={makeRegistration()} onChange={onChange} />)

	// Click Alice's checkbox
	fireEvent.click(screen.getByLabelText("Alice Smith"))
	expect(onChange).toHaveBeenLastCalledWith([1])

	// Click Bob's checkbox too
	fireEvent.click(screen.getByLabelText("Bob Jones"))
	expect(onChange).toHaveBeenLastCalledWith([1, 2])

	// Uncheck Alice
	fireEvent.click(screen.getByLabelText("Alice Smith"))
	expect(onChange).toHaveBeenLastCalledWith([2])
})

test("single-select (limit=1): only one player selectable at a time", async () => {
	const onChange = jest.fn()
	const { RegisteredPlayerSelector } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/components/registered-player-selector"
	)

	render(
		<RegisteredPlayerSelector registration={makeRegistration()} limit={1} onChange={onChange} />,
	)

	// No Select All checkbox in single-select mode
	expect(screen.queryByLabelText("Select All")).toBeNull()

	// Click Alice
	fireEvent.click(screen.getByLabelText("Alice Smith"))
	expect(onChange).toHaveBeenLastCalledWith([1])

	// Click Bob — should replace Alice, not add
	fireEvent.click(screen.getByLabelText("Bob Jones"))
	expect(onChange).toHaveBeenLastCalledWith([2])
})

test("select all toggles all players", async () => {
	const onChange = jest.fn()
	const { RegisteredPlayerSelector } = await import(
		"@/app/event/[eventDate]/[eventName]/manage/components/registered-player-selector"
	)

	render(<RegisteredPlayerSelector registration={makeRegistration()} onChange={onChange} />)

	fireEvent.click(screen.getByLabelText("Select All"))
	expect(onChange).toHaveBeenLastCalledWith([1, 2])

	// Click again to deselect all
	fireEvent.click(screen.getByLabelText("Select All"))
	expect(onChange).toHaveBeenLastCalledWith([])
})
