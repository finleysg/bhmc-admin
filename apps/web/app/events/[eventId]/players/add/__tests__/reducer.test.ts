import { reducer, getInitialState, generateAdminRegistration } from "../reducer"
import {
	AgeRestrictionTypeChoices,
	EventStatusChoices,
	EventTypeChoices,
	FeeRestrictionChoices,
	PayoutTypeChoices,
	Player,
	RegistrationStatusChoices,
	RegistrationTypeChoices,
	type AvailableSlotGroup,
} from "@repo/domain/types"
import type { AdminRegistrationOptionsState } from "@/components/admin-registration-options"

// reducer.test.ts

function mockEvent(): import("@repo/domain/types").CompleteClubEvent {
	return {
		id: 1,
		ggId: "GG1",
		name: "Test Event",
		eventType: EventTypeChoices.WEEKNIGHT,
		registrationType: RegistrationTypeChoices.MEMBER,
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
				tees: [{ id: 1, name: "Blue", courseId: 10 }],
			},
		],
		eventFees: [
			{
				id: 201,
				amount: 50,
				eventId: 1,
				isRequired: false,
				displayOrder: 1,
				feeTypeId: 1,
				feeType: {
					id: 1,
					name: "Entry",
					code: "ENTRY",
					payout: PayoutTypeChoices.CASH,
					restriction: FeeRestrictionChoices.NONE,
				},
			},
			{
				id: 202,
				amount: 75,
				eventId: 1,
				isRequired: false,
				displayOrder: 2,
				feeTypeId: 2,
				feeType: {
					id: 2,
					name: "Other",
					code: "OTHER",
					payout: PayoutTypeChoices.CASH,
					restriction: FeeRestrictionChoices.NONE,
				},
			},
		],
		eventRounds: [],
		tournaments: [],
		status: EventStatusChoices.SCHEDULED,
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 1,
		ageRestrictionType: AgeRestrictionTypeChoices.NONE,
	}
}

function mockPlayer(id = 1): Player {
	return {
		id,
		userId: id + 100,
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
		holeNumber: 1,
		startingOrder: 1,
		slots: [
			{
				id: 301,
				registrationId: 0,
				eventId: 1,
				startingOrder: 1,
				slot: 1,
				status: RegistrationStatusChoices.PENDING,
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
		expect(state.adminRegistration).toBeNull()
		expect(state.isLoading).toBe(true)
	})

	describe("State transition logic", () => {
		it("canSelectGroup true when players exist and event.canChoose", () => {
			const event = { ...mockEvent(), canChoose: true }
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "ADD_PLAYER", payload: mockPlayer(1) })
			expect(state.canSelectGroup).toBe(true)
		})
		it("canSelectGroup false when event.canChoose is false", () => {
			const event = { ...mockEvent(), canChoose: false }
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "ADD_PLAYER", payload: mockPlayer(1) })
			expect(state.canSelectGroup).toBe(false)
		})
		it("canSelectFees requires players + slots for canChoose events", () => {
			const event = { ...mockEvent(), canChoose: true }
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "ADD_PLAYER", payload: mockPlayer(1) })
			expect(state.canSelectFees).toBe(false)
			const group = mockSlotGroup()
			state = reducer(state, {
				type: "SELECT_SLOTS",
				payload: { slotIds: group.slots.map((s) => s.id ?? 0), group },
			})
			expect(state.canSelectFees).toBe(true)
		})
		it("canSelectFees requires only players for non-canChoose events", () => {
			const event = { ...mockEvent(), canChoose: false }
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "ADD_PLAYER", payload: mockPlayer(1) })
			expect(state.canSelectFees).toBe(true)
		})
		// TODO: fix this test
		it.skip("canCompleteRegistration requires all conditions met", () => {
			const event = mockEvent()
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "ADD_PLAYER", payload: mockPlayer(1) })
			const group = mockSlotGroup()
			state = reducer(state, {
				type: "SELECT_SLOTS",
				payload: { slotIds: group.slots.map((s) => s.id ?? -1), group },
			})
			const fees = [{ playerId: 1, eventFeeId: event.eventFees[0].id }]
			state = reducer(state, { type: "SET_FEES", payload: fees })
			expect(state.canCompleteRegistration).toBe(true)
		})
		it("canCompleteRegistration false when missing registrationId", () => {
			const event = mockEvent()
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "ADD_PLAYER", payload: mockPlayer(1) })
			const group = mockSlotGroup()
			state = reducer(state, {
				type: "SELECT_SLOTS",
				payload: { slotIds: group.slots.map((s) => s.id ?? -1), group },
			})
			const fees = [{ playerId: 1, eventFeeId: event.eventFees[0].id }]
			state = reducer(state, { type: "SET_FEES", payload: fees })
			expect(state.canCompleteRegistration).toBe(false)
		})
	})

	describe("generateAdminRegistration", () => {
		it("returns null when canCompleteRegistration is false", () => {
			const state = { ...getInitialState(), canCompleteRegistration: false }
			expect(generateAdminRegistration(state)).toBeNull()
		})
		it("derives courseId from selectedSlotGroup holes", () => {
			const event = mockEvent()
			const group = mockSlotGroup()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				selectedFees: [{ playerId: 1, eventFeeId: event.eventFees[0].id }],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.courseId).toBe(event.courses?.[0].id)
		})
		it("handles event without canChoose (courseId = null)", () => {
			const event = { ...mockEvent(), canChoose: false }
			const group = mockSlotGroup()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				selectedFees: [{ playerId: 1, eventFeeId: event.eventFees[0].id }],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.courseId).toBeNull()
		})
		it("maps selectedFees to slots correctly", () => {
			const event = mockEvent()
			const group = mockSlotGroup()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				selectedFees: [{ playerId: 1, eventFeeId: event.eventFees[0].id }],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.slots[0].feeIds).toContain(event.eventFees[0].id)
		})
		it("builds slots array with correct structure", () => {
			const event = mockEvent()
			const group = mockSlotGroup()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				selectedFees: [{ playerId: 1, eventFeeId: event.eventFees[0].id }],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.slots.length).toBe(group.slots.length)
			expect(reg?.slots[0].slotId).toBe(group.slots[0].id)
		})
		it("handles players with no fees", () => {
			const event = mockEvent()
			const group = mockSlotGroup()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				selectedFees: [],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.slots[0].feeIds).toEqual([])
		})
		it("handles multiple players with different fees", () => {
			const event = mockEvent()
			const group: AvailableSlotGroup = {
				holeId: 100,
				holeNumber: 1,
				startingOrder: 1,
				slots: [
					{
						id: 301,
						registrationId: 0,
						eventId: 1,
						startingOrder: 1,
						slot: 1,
						status: RegistrationStatusChoices.PENDING,
					},
					{
						id: 302,
						registrationId: 0,
						eventId: 1,
						startingOrder: 2,
						slot: 2,
						status: RegistrationStatusChoices.PENDING,
					},
				],
			}
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1), mockPlayer(2)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				selectedFees: [
					{ playerId: 1, eventFeeId: event.eventFees[0].id },
					{ playerId: 2, eventFeeId: event.eventFees[1].id },
				],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.slots[0].feeIds).toContain(event.eventFees[0].id)
			expect(reg?.slots[1].feeIds).toContain(event.eventFees[1].id)
		})
		it("uses signedUpBy from state", () => {
			const event = mockEvent()
			const group = mockSlotGroup()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				signedUpBy: "admin",
				selectedFees: [{ playerId: 1, eventFeeId: event.eventFees[0].id }],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.signedUpBy).toBe("admin")
		})
		it("uses registrationOptions correctly", () => {
			const event = mockEvent()
			const group = mockSlotGroup()
			const options = mockOptions()
			const state = {
				...getInitialState(),
				event,
				selectedPlayers: [mockPlayer(1)],
				selectedSlotGroup: group,
				canCompleteRegistration: true,
				registrationOptions: options,
				selectedFees: [{ playerId: 1, eventFeeId: event.eventFees[0].id }],
			}
			const reg = generateAdminRegistration(state)
			expect(reg?.expires).toBe(options.expires)
			expect(reg?.notes).toBe(options.notes)
			expect(reg?.collectPayment).toBe(options.sendPaymentRequest)
		})
	})

	describe("Edge cases", () => {
		it("ADD_PLAYER with duplicate player (same id)", () => {
			const event = mockEvent()
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			const player = mockPlayer(1)
			state = reducer(state, { type: "ADD_PLAYER", payload: player })
			state = reducer(state, { type: "ADD_PLAYER", payload: player })
			// Should allow duplicates, reducer does not dedupe
			expect(state.selectedPlayers.filter((p) => p.id === player.id).length).toBe(2)
		})
		it("REMOVE_PLAYER when player doesn't exist", () => {
			const event = mockEvent()
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			const player1 = mockPlayer(1)
			const player2 = mockPlayer(2)
			state = reducer(state, { type: "ADD_PLAYER", payload: player1 })
			state = reducer(state, { type: "REMOVE_PLAYER", payload: player2 })
			expect(state.selectedPlayers).toContainEqual(player1)
		})
		it("SELECT_SLOTS with undefined group", () => {
			const event = mockEvent()
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "SELECT_SLOTS", payload: { slotIds: [], group: undefined } })
			expect(state.selectedSlotGroup).toBeNull()
		})
		it("SET_FEES with empty array", () => {
			const event = mockEvent()
			let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
			state = reducer(state, { type: "SET_FEES", payload: [] })
			expect(state.selectedFees).toEqual([])
		})
		it("SET_ERROR with Error object vs string vs unknown", () => {
			let state = reducer(getInitialState(), { type: "SET_ERROR", payload: new Error("fail") })
			expect(state.error).toBe("fail")
			state = reducer(state, { type: "SET_ERROR", payload: "fail2" })
			expect(state.error).toBe("fail2")
			state = reducer(state, { type: "SET_ERROR", payload: { foo: "bar" } })
			expect(state.error).toBe(JSON.stringify({ foo: "bar" }))
		})
	})

	it("handles SET_EVENT", () => {
		const event = mockEvent()
		const state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		expect(state.event).toEqual(event)
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
	})

	it("handles SELECT_SLOTS", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player = mockPlayer(1)
		state = reducer(state, { type: "ADD_PLAYER", payload: player })
		const group = mockSlotGroup()
		state = reducer(state, {
			type: "SELECT_SLOTS",
			payload: { slotIds: group.slots.map((s) => s.id ?? -1), group },
		})
		expect(state.selectedSlotGroup).toEqual(group)
	})

	it("handles SET_FEES", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const player = mockPlayer(1)
		const group = mockSlotGroup()
		state = reducer(state, { type: "ADD_PLAYER", payload: player })
		state = reducer(state, {
			type: "SELECT_SLOTS",
			payload: { slotIds: group.slots.map((s) => s.id ?? -1), group },
		})
		const fees = [{ playerId: player.id, eventFeeId: event.eventFees[0].id }]
		state = reducer(state, { type: "SET_FEES", payload: fees })
		expect(state.selectedFees).toEqual(fees)
	})

	it("handles SET_REGISTRATION_OPTIONS", () => {
		const event = mockEvent()
		let state = reducer(getInitialState(), { type: "SET_EVENT", payload: event })
		const options = mockOptions()
		state = reducer(state, { type: "SET_REGISTRATION_OPTIONS", payload: options })
		expect(state.registrationOptions).toEqual(options)
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
		expect(state.signedUpBy).toBe("admin")
	})
})
