import type { ClubEventDetail, EventFee, FeeType } from "../types"
import type { FeePlayer } from "../registration/fee-utils"
import {
	CompleteStep,
	defaultRegistrationState,
	PendingStep,
	RegisterStep,
	registrationReducer,
	type RegistrationState,
} from "../registration/registration-reducer"
import type {
	ServerPayment,
	ServerRegistration,
	ServerRegistrationFee,
	ServerRegistrationSlot,
} from "../registration/types"

function makeFeeType(overrides: Partial<FeeType> = {}): FeeType {
	return { id: 1, name: "Event Fee", code: "EF", restriction: "None", ...overrides }
}

function makeEventFee(overrides: Partial<EventFee> = {}): EventFee {
	return {
		id: 1,
		event: 1,
		fee_type: makeFeeType(),
		amount: "5.00",
		is_required: true,
		display_order: 1,
		override_amount: null,
		override_restriction: null,
		...overrides,
	}
}

function makeEvent(overrides: Partial<ClubEventDetail> = {}): ClubEventDetail {
	return {
		id: 1,
		name: "Wednesday Weeknight",
		rounds: 1,
		ghin_required: false,
		total_groups: 6,
		status: "S",
		minimum_signup_group_size: 1,
		maximum_signup_group_size: 5,
		group_size: 5,
		start_type: "TT",
		can_choose: true,
		registration_window: "future",
		external_url: null,
		season: 2024,
		tee_time_splits: null,
		notes: null,
		event_type: "N",
		skins_type: "I",
		season_points: 1,
		portal_url: null,
		priority_signup_start: null,
		start_date: "2024-06-15",
		start_time: "3:00 PM",
		registration_type: "M",
		signup_start: null,
		signup_end: null,
		signup_waves: null,
		payments_end: null,
		registration_maximum: null,
		courses: [],
		fees: [makeEventFee()],
		sessions: [],
		default_tag: null,
		starter_time_interval: 8,
		team_size: 1,
		age_restriction: null,
		age_restriction_type: "",
		...overrides,
	}
}

function makeSlot(overrides: Partial<ServerRegistrationSlot> = {}): ServerRegistrationSlot {
	return {
		id: 10,
		eventId: 1,
		registrationId: 1,
		holeId: null,
		player: null,
		startingOrder: 0,
		slot: 0,
		status: "A",
		fees: [],
		...overrides,
	}
}

function makeRegistration(overrides: Partial<ServerRegistration> = {}): ServerRegistration {
	return {
		id: 1,
		eventId: 1,
		courseId: null,
		signedUpBy: "test@test.com",
		expires: new Date(Date.now() + 300000).toISOString(),
		notes: null,
		createdDate: new Date().toISOString(),
		slots: [makeSlot()],
		...overrides,
	}
}

function makePayment(overrides: Partial<ServerPayment> = {}): ServerPayment {
	return {
		id: 0,
		eventId: 1,
		userId: 1,
		paymentCode: "",
		paymentKey: null,
		paymentAmount: null,
		transactionFee: null,
		notificationType: null,
		confirmed: false,
		details: [],
		...overrides,
	}
}

function makeFeePlayer(overrides: Partial<FeePlayer> = {}): FeePlayer {
	return {
		birthDate: "1980-06-15",
		isMember: true,
		lastSeason: null,
		...overrides,
	}
}

function makeState(overrides: Partial<RegistrationState> = {}): RegistrationState {
	return { ...defaultRegistrationState, ...overrides }
}

describe("registrationReducer", () => {
	describe("load-event", () => {
		it("sets the club event and resets state", () => {
			const event = makeEvent()
			const result = registrationReducer(defaultRegistrationState, {
				type: "load-event",
				payload: { clubEvent: event, correlationId: "abc123" },
			})
			expect(result.clubEvent).toBe(event)
			expect(result.correlationId).toBe("abc123")
			expect(result.mode).toBe("idle")
			expect(result.currentStep).toBe(PendingStep)
			expect(result.registration).toBeNull()
			expect(result.payment).toBeNull()
		})
	})

	describe("create-registration", () => {
		it("sets mode to new and moves to register step", () => {
			const state = makeState({ clubEvent: makeEvent() })
			const registration = makeRegistration()
			const payment = makePayment()
			const result = registrationReducer(state, {
				type: "create-registration",
				payload: { registration, payment },
			})
			expect(result.mode).toBe("new")
			expect(result.registration).toBe(registration)
			expect(result.payment).toBe(payment)
			expect(result.currentStep).toBe(RegisterStep)
		})
	})

	describe("load-registration", () => {
		it("sets mode to edit and maps existing fees", () => {
			const state = makeState({ clubEvent: makeEvent() })
			const fee: ServerRegistrationFee = {
				id: 1,
				eventFeeId: 1,
				registrationSlotId: 10,
				paymentId: 1,
				isPaid: true,
				amount: "5.00",
			}
			const registration = makeRegistration({ slots: [makeSlot({ fees: [fee] })] })
			const payment = makePayment()

			const result = registrationReducer(state, {
				type: "load-registration",
				payload: { registration, payment, existingFees: [fee] },
			})
			expect(result.mode).toBe("edit")
			expect(result.currentStep).toBe(RegisterStep)
			expect(result.existingFees?.get("10-1")).toBe(fee)
		})
	})

	describe("cancel-registration", () => {
		it("resets to idle state", () => {
			const state = makeState({
				mode: "new",
				registration: makeRegistration(),
				payment: makePayment(),
				currentStep: RegisterStep,
			})
			const result = registrationReducer(state, { type: "cancel-registration" })
			expect(result.mode).toBe("idle")
			expect(result.registration).toBeNull()
			expect(result.payment).toBeNull()
			expect(result.currentStep).toBe(PendingStep)
		})
	})

	describe("complete-registration", () => {
		it("resets state and sets complete step", () => {
			const state = makeState({
				mode: "new",
				registration: makeRegistration(),
				payment: makePayment(),
			})
			const result = registrationReducer(state, { type: "complete-registration" })
			expect(result.mode).toBe("idle")
			expect(result.currentStep).toBe(CompleteStep)
			expect(result.registration).toBeNull()
		})
	})

	describe("update-registration-notes", () => {
		it("updates notes on the registration", () => {
			const state = makeState({ registration: makeRegistration() })
			const result = registrationReducer(state, {
				type: "update-registration-notes",
				payload: { notes: "Need a cart" },
			})
			expect(result.registration?.notes).toBe("Need a cart")
		})

		it("does nothing when no registration", () => {
			const result = registrationReducer(defaultRegistrationState, {
				type: "update-registration-notes",
				payload: { notes: "test" },
			})
			expect(result.registration).toBeNull()
		})
	})

	describe("add-player", () => {
		it("sets player on the matching slot", () => {
			const slot = makeSlot({ id: 10 })
			const state = makeState({
				clubEvent: makeEvent(),
				registration: makeRegistration({ slots: [slot] }),
				payment: makePayment(),
			})
			const result = registrationReducer(state, {
				type: "add-player",
				payload: {
					slot,
					playerId: 42,
					playerName: "John Doe",
					player: makeFeePlayer(),
				},
			})
			expect(result.registration?.slots[0].player?.id).toBe(42)
			expect(result.registration?.slots[0].player?.firstName).toBe("John")
			expect(result.registration?.slots[0].player?.lastName).toBe("Doe")
		})

		it("auto-adds required fees for the slot", () => {
			const slot = makeSlot({ id: 10 })
			const requiredFee = makeEventFee({ id: 1, is_required: true, amount: "5.00" })
			const optionalFee = makeEventFee({ id: 2, is_required: false, amount: "10.00" })
			const event = makeEvent({ fees: [requiredFee, optionalFee] })
			const state = makeState({
				clubEvent: event,
				registration: makeRegistration({ slots: [slot] }),
				payment: makePayment(),
			})
			const result = registrationReducer(state, {
				type: "add-player",
				payload: {
					slot,
					playerId: 42,
					playerName: "John Doe",
					player: makeFeePlayer(),
				},
			})
			expect(result.payment?.details).toHaveLength(1)
			expect(result.payment?.details[0].eventFeeId).toBe(1)
			expect(result.payment?.details[0].amount).toBe(5)
		})

		it("uses senior override amount when player qualifies", () => {
			const slot = makeSlot({ id: 10 })
			const seniorBirthYear = new Date().getFullYear() - 70
			const greensFee = makeEventFee({
				id: 3,
				is_required: true,
				amount: "28.00",
				override_amount: "21.00",
				override_restriction: "Seniors",
			})
			const event = makeEvent({ fees: [greensFee] })
			const state = makeState({
				clubEvent: event,
				registration: makeRegistration({ slots: [slot] }),
				payment: makePayment(),
			})
			const result = registrationReducer(state, {
				type: "add-player",
				payload: {
					slot,
					playerId: 42,
					playerName: "Roger Schlins",
					player: makeFeePlayer({ birthDate: `${seniorBirthYear}-01-15` }),
				},
			})
			expect(result.payment?.details).toHaveLength(1)
			expect(result.payment?.details[0].amount).toBe(21)
		})

		it("uses base amount when player birthDate is null (friend picker without birth data)", () => {
			const slot = makeSlot({ id: 10 })
			const greensFee = makeEventFee({
				id: 3,
				is_required: true,
				amount: "28.00",
				override_amount: "21.00",
				override_restriction: "Seniors",
			})
			const event = makeEvent({ fees: [greensFee] })
			const state = makeState({
				clubEvent: event,
				registration: makeRegistration({ slots: [slot] }),
				payment: makePayment(),
			})
			const result = registrationReducer(state, {
				type: "add-player",
				payload: {
					slot,
					playerId: 42,
					playerName: "Dennis Melland",
					player: makeFeePlayer({ birthDate: null }),
				},
			})
			expect(result.payment?.details).toHaveLength(1)
			expect(result.payment?.details[0].amount).toBe(28)
		})
	})

	describe("remove-player", () => {
		it("clears the player and removes fees for the slot", () => {
			const slot = makeSlot({
				id: 10,
				player: {
					id: 42,
					firstName: "John",
					lastName: "Doe",
					email: null,
					ghin: null,
					birthDate: null,
					phoneNumber: null,
					tee: null,
					isMember: true,
					lastSeason: null,
				},
			})
			const state = makeState({
				registration: makeRegistration({ slots: [slot] }),
				payment: makePayment({
					details: [
						{
							id: 0,
							paymentId: 0,
							eventFeeId: 1,
							registrationSlotId: 10,
							amount: 5,
							isPaid: false,
						},
					],
				}),
			})
			const result = registrationReducer(state, {
				type: "remove-player",
				payload: { slotId: 10 },
			})
			expect(result.registration?.slots[0].player).toBeNull()
			expect(result.payment?.details).toHaveLength(0)
		})
	})

	describe("add-fee", () => {
		it("adds a fee detail to the payment", () => {
			const state = makeState({ payment: makePayment() })
			const eventFee = makeEventFee({ id: 5, amount: "10.00" })
			const result = registrationReducer(state, {
				type: "add-fee",
				payload: { slotId: 10, eventFee, player: makeFeePlayer() },
			})
			expect(result.payment?.details).toHaveLength(1)
			expect(result.payment?.details[0].eventFeeId).toBe(5)
			expect(result.payment?.details[0].registrationSlotId).toBe(10)
			expect(result.payment?.details[0].amount).toBe(10)
		})
	})

	describe("remove-fee", () => {
		it("removes the matching fee detail", () => {
			const state = makeState({
				payment: makePayment({
					details: [
						{
							id: 0,
							paymentId: 0,
							eventFeeId: 5,
							registrationSlotId: 10,
							amount: 10,
							isPaid: false,
						},
						{
							id: 0,
							paymentId: 0,
							eventFeeId: 6,
							registrationSlotId: 10,
							amount: 5,
							isPaid: false,
						},
					],
				}),
			})
			const result = registrationReducer(state, {
				type: "remove-fee",
				payload: { slotId: 10, eventFeeId: 5 },
			})
			expect(result.payment?.details).toHaveLength(1)
			expect(result.payment?.details[0].eventFeeId).toBe(6)
		})
	})

	describe("update-error", () => {
		it("sets the error", () => {
			const result = registrationReducer(defaultRegistrationState, {
				type: "update-error",
				payload: { error: "Something went wrong" },
			})
			expect(result.error).toBe("Something went wrong")
		})

		it("clears the error", () => {
			const state = makeState({ error: "previous error" })
			const result = registrationReducer(state, {
				type: "update-error",
				payload: { error: null },
			})
			expect(result.error).toBeNull()
		})
	})

	describe("update-payment", () => {
		it("replaces the payment and clears error", () => {
			const state = makeState({ error: "old error" })
			const payment = makePayment({ id: 99 })
			const result = registrationReducer(state, {
				type: "update-payment",
				payload: { payment },
			})
			expect(result.payment?.id).toBe(99)
			expect(result.error).toBeNull()
		})
	})

	describe("initiate-stripe-session", () => {
		it("sets the stripe client session key", () => {
			const result = registrationReducer(defaultRegistrationState, {
				type: "initiate-stripe-session",
				payload: { clientSessionKey: "cs_test_123" },
			})
			expect(result.stripeClientSession).toBe("cs_test_123")
		})
	})

	describe("update-sse-wave", () => {
		it("sets the SSE current wave", () => {
			const result = registrationReducer(defaultRegistrationState, {
				type: "update-sse-wave",
				payload: { wave: 2 },
			})
			expect(result.sseCurrentWave).toBe(2)
		})

		it("sets wave from null to a number", () => {
			const state = makeState({ sseCurrentWave: null })
			const result = registrationReducer(state, {
				type: "update-sse-wave",
				payload: { wave: 1 },
			})
			expect(result.sseCurrentWave).toBe(1)
		})

		it("updates wave from one value to another", () => {
			const state = makeState({ sseCurrentWave: 1 })
			const result = registrationReducer(state, {
				type: "update-sse-wave",
				payload: { wave: 3 },
			})
			expect(result.sseCurrentWave).toBe(3)
		})

		it("sets wave to 0 (all waves locked)", () => {
			const state = makeState({ sseCurrentWave: 2 })
			const result = registrationReducer(state, {
				type: "update-sse-wave",
				payload: { wave: 0 },
			})
			expect(result.sseCurrentWave).toBe(0)
		})
	})

	describe("update-step", () => {
		it("changes the current step", () => {
			const result = registrationReducer(defaultRegistrationState, {
				type: "update-step",
				payload: { step: RegisterStep },
			})
			expect(result.currentStep).toBe(RegisterStep)
		})
	})

	describe("reset-registration", () => {
		it("resets state with a new club event", () => {
			const state = makeState({
				mode: "new",
				registration: makeRegistration(),
				payment: makePayment(),
			})
			const newEvent = makeEvent({ id: 2, name: "New Event" })
			const result = registrationReducer(state, {
				type: "reset-registration",
				payload: { clubEvent: newEvent },
			})
			expect(result.mode).toBe("idle")
			expect(result.clubEvent?.id).toBe(2)
			expect(result.registration).toBeNull()
			expect(result.currentStep).toBe(PendingStep)
		})
	})

	describe("update-registration", () => {
		it("replaces the registration and clears error", () => {
			const state = makeState({
				registration: makeRegistration(),
				error: "old error",
			})
			const newReg = makeRegistration({ id: 99 })
			const result = registrationReducer(state, {
				type: "update-registration",
				payload: { registration: newReg },
			})
			expect(result.registration?.id).toBe(99)
			expect(result.error).toBeNull()
		})
	})
})
