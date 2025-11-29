// reducer.test.ts
import { reducer, getInitialState } from "../reducer"
import type { ClubEvent, Player, AvailableSlotGroup } from "@repo/domain/types"
import type { AdminRegistrationOptionsState } from "@/components/admin-registration-options"

function mockEvent(): ClubEvent {
	return {
		id: 1,
		name: "Test Event",
		eventType: "tournament",
		registrationType: "individual",
		ghinRequired: false,
		startDate: "2025-01-01",
		canChoose: true,
		courses: [
			{
				id: 10,
				name: "Course A",
				numberOfHoles: 2,
				holes: [
					{ id: 100, courseId: 10, holeNumber: 1, par: 4 },
					{ id: 101, courseId: 10, holeNumber: 2, par: 3 },
				],
			},
		],
		eventFees: [
			{ id: 201, amount: 50, eventId: 1, isRequired: false, displayOrder: 1, feeTypeId: 1 },
			{ id: 202, amount: 75, eventId: 1, isRequired: false, displayOrder: 2, feeTypeId: 2 },
		],
		status: "active",
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 1,
		ageRestrictionType: "none",
	}
}

function mockPlayer(id = 1): Player {
	return {
		id,
		email: `player${id}@test.com`,
		firstName: `First${id}`,
		lastName: `Last${id}`,
		tee: "blue",
		isMember: true,
		birthDate: "2000-01-01",
		ghin: "",
	}
}

function mockSlotGroup(): AvailableSlotGroup {
	return {
		holeId: 100,
		startingOrder: 1,
		slots: [
			{
				id: 301,
				registrationId: 0,
				eventId: 1,
				startingOrder: 1,
				slot: 1,
				status: "P",
			},
			{
				id: 302,
				registrationId: 0,
				eventId: 1,
				startingOrder: 2,
				slot: 2,
				status: "P",
			},
		],
	}
}

function mockOptions(): AdminRegistrationOptionsState {
	return {
		expires: 24,
		sendPaymentRequest: true,
		notes: "Test note",
	}
}

describe("AddPlayer reducer", () => {
	it("returns initial state", () => {
		const state = getInitialState()
		expect(state.event).toBeNull()
		expect(state.selectedPlayers).toEqual([])
		expect(state.adminRegistration.userId).toBe(0)
		expect(state.adminRegistration.slots).toEqual([])
		expect(state.isLoading).toBe(true)
	})

	it("handles SET_EVENT", () => {
		const event = mockEvent()
		const state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		expect(state.event).toEqual(event)
		expect(state.adminRegistration.courseId).toBeNull()
	})

	it("handles SET_IS_LOADING", () => {
		const state = reducer(getInitialState(), { type: "SET_IS_LOADING", payload: false })
		expect(state.isLoading).toBe(false)
	})

	it("handles ADD_PLAYER", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player = mockPlayer(1)
		state = reducer(state, { type: "ADD_PLAYER", payload: player })
		expect(state.selectedPlayers).toContainEqual(player)
		expect(state.adminRegistration.userId).toBe(player.id)
		expect(state.canSelectGroup).toBe(true)
	})

	it("handles REMOVE_PLAYER", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player1 = mockPlayer(1)
		const player2 = mockPlayer(2)
		state = reducer(state, { type: "ADD_PLAYER", payload: player1 })
		state = reducer(state, { type: "ADD_PLAYER", payload: player2 })
		state = reducer(state, { type: "REMOVE_PLAYER", payload: player1 })
		expect(state.selectedPlayers).not.toContainEqual(player1)
		expect(state.selectedPlayers).toContainEqual(player2)
		expect(state.adminRegistration.userId).toBe(player2.id)
	})

	it("handles SELECT_SLOTS", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player = mockPlayer(1)
		state = reducer(state, { type: "ADD_PLAYER", payload: player })
		const group = mockSlotGroup()
		state = reducer(state, {
			type: "SELECT_SLOTS",
			payload: { slotIds: group.slots.map((s) => s.id), group },
		})
		expect(state.selectedSlotGroup).toEqual(group)
		expect(state.adminRegistration.courseId).toBe(event.courses[0].id)
		expect(state.adminRegistration.startingHoleId).toBe(group.holeId)
		expect(state.adminRegistration.slots.length).toBe(group.slots.length)
	})

	it("handles SET_FEES", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player = mockPlayer(1)
		const group = mockSlotGroup()
		state = reducer(state, { type: "ADD_PLAYER", payload: player })
		state = reducer(state, {
			type: "SELECT_SLOTS",
			payload: { slotIds: group.slots.map((s) => s.id), group },
		})
		const fees = [{ playerId: player.id, eventFeeId: event.eventFees[0].id }]
		state = reducer(state, { type: "SET_FEES", payload: fees })
		expect(state.selectedFees).toEqual(fees)
		expect(state.adminRegistration.slots[0].fees[0].id).toBe(event.eventFees[0].id)
	})

	it("handles SET_REGISTRATION_ID", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player = mockPlayer(1)
		const group = mockSlotGroup()
		state = reducer(state, { type: "ADD_PLAYER", payload: player })
		state = reducer(state, {
			type: "SELECT_SLOTS",
			payload: { slotIds: group.slots.map((s) => s.id), group },
		})
		state = reducer(state, { type: "SET_REGISTRATION_ID", payload: 555 })
		expect(state.registrationId).toBe(555)
		expect(state.canCompleteRegistration).toBe(true)
		expect(state.adminRegistration.slots.every((slot) => slot.registrationId === 555)).toBe(true)
	})

	it("handles SET_REGISTRATION_OPTIONS", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const options = mockOptions()
		state = reducer(state, { type: "SET_REGISTRATION_OPTIONS", payload: options })
		expect(state.registrationOptions).toEqual(options)
		expect(state.adminRegistration.expires).toBe(options.expires)
		expect(state.adminRegistration.notes).toBe(options.notes)
		expect(state.adminRegistration.collectPayment).toBe(options.sendPaymentRequest)
	})

	it("handles SET_COMPLETE_SUCCESS", () => {
		const state = reducer(getInitialState(), { type: "SET_COMPLETE_SUCCESS", payload: true })
		expect(state.completeSuccess).toBe(true)
	})

	it("handles SET_ERROR and RESET_ERROR", () => {
		let state = reducer(getInitialState(), { type: "SET_ERROR", payload: "Something went wrong" })
		expect(state.error).toBe("Something went wrong")
		state = reducer(state, { type: "RESET_ERROR" })
		expect(state.error).toBeNull()
	})

	it("handles SET_USER", () => {
		let state = getInitialState()
		state = reducer(state, { type: "SET_USER", payload: { signedUpBy: "admin" } })
		expect(state.adminRegistration.signedUpBy).toBe("admin")
	})
})
