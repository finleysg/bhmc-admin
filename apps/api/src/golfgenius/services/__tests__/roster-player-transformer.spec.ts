import { CompleteClubEvent, RegisteredPlayer } from "@repo/domain/types"

import { RosterPlayerTransformer, TransformationContext } from "../roster-player-transformer"

jest.mock("@repo/domain/functions", () => ({
	getPlayerTeamName: jest.fn().mockReturnValue("Team-1"),
}))

// =============================================================================
// Test Fixtures
// =============================================================================

const createPlayer = (
	overrides: Partial<RegisteredPlayer["player"]> = {},
): RegisteredPlayer["player"] => ({
	id: 1,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	tee: "White",
	isMember: true,
	ghin: "1234567",
	...overrides,
})

const createSlot = (
	overrides: Partial<RegisteredPlayer["slot"]> = {},
): RegisteredPlayer["slot"] => ({
	id: 10,
	registrationId: 1,
	eventId: 100,
	startingOrder: 0,
	slot: 0,
	status: "P",
	holeId: 1,
	fees: [],
	...overrides,
})

const createRegisteredPlayer = (overrides: Partial<RegisteredPlayer> = {}): RegisteredPlayer => ({
	player: createPlayer(),
	registration: {
		id: 1,
		eventId: 100,
		signedUpBy: "John Doe",
		userId: 10,
		createdDate: "2025-06-01 08:00:00",
	},
	slot: createSlot(),
	course: { id: 1, name: "East", numberOfHoles: 9 },
	hole: { id: 1, courseId: 1, holeNumber: 1, par: 4 },
	fees: [],
	...overrides,
})

const createCompleteEvent = (overrides: Partial<CompleteClubEvent> = {}): CompleteClubEvent => ({
	id: 100,
	eventType: "N",
	name: "Test Event",
	registrationType: "M",
	canChoose: true,
	ghinRequired: false,
	startDate: "2025-06-15",
	status: "S",
	season: 2025,
	starterTimeInterval: 10,
	teamSize: 4,
	ageRestrictionType: "N",
	ggId: "gg-100",
	eventRounds: [{ id: 1, eventId: 100, roundNumber: 1, roundDate: "2025-06-15", ggId: "round-1" }],
	tournaments: [],
	eventFees: [],
	...overrides,
})

const createContext = (overrides: Partial<TransformationContext> = {}): TransformationContext => {
	const player = createRegisteredPlayer()
	return {
		event: createCompleteEvent(),
		group: [player],
		course: { id: 1, name: "East", numberOfHoles: 9 },
		...overrides,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("RosterPlayerTransformer", () => {
	let transformer: RosterPlayerTransformer

	beforeEach(() => {
		transformer = new RosterPlayerTransformer()
	})

	it("maps base custom fields with bhmc_ prefix", () => {
		const player = createRegisteredPlayer()
		const context = createContext({ group: [player] })

		const result = transformer.transformToGgMember(player, context)

		expect(result.custom_fields).toEqual(
			expect.objectContaining({
				bhmc_team: "Team-1",
				bhmc_course: "East",
				bhmc_tee: "White",
				bhmc_player_id: "1",
			}),
		)
	})

	it("includes bhmc_session when slot has sessionId", () => {
		const player = createRegisteredPlayer({
			slot: createSlot({ sessionId: 5 }),
		})
		const context = createContext({ group: [player] })

		const result = transformer.transformToGgMember(player, context)

		expect(result.custom_fields.bhmc_session).toBe("5")
	})

	it("omits bhmc_session when slot has no sessionId", () => {
		const player = createRegisteredPlayer({
			slot: createSlot({ sessionId: null }),
		})
		const context = createContext({ group: [player] })

		const result = transformer.transformToGgMember(player, context)

		expect(result.custom_fields).not.toHaveProperty("bhmc_session")
	})

	it("adds dynamic fee fields with bhmc_ prefix", () => {
		const feeType = {
			id: 1,
			name: "Skins",
			code: "SK",
			payout: "Cash" as const,
			restriction: "None" as const,
		}
		const eventFee = {
			id: 50,
			eventId: 100,
			amount: 10,
			isRequired: false,
			displayOrder: 1,
			feeType,
			feeTypeId: 1,
		}

		const player = createRegisteredPlayer({
			slot: createSlot({ id: 10 }),
			fees: [
				{
					id: 1,
					registrationSlotId: 10,
					paymentId: 1,
					amount: 10,
					isPaid: true,
					eventFeeId: 50,
					eventFee,
				},
			],
		})

		const context = createContext({
			event: createCompleteEvent({ eventFees: [eventFee] }),
			group: [player],
		})

		const result = transformer.transformToGgMember(player, context)

		expect(result.custom_fields.bhmc_skins).toBe("10")
	})

	it("normalizes fee names by removing special characters", () => {
		const feeType = {
			id: 2,
			name: "Skins (Indiv.)",
			code: "SI",
			payout: "Cash" as const,
			restriction: "None" as const,
		}
		const eventFee = {
			id: 51,
			eventId: 100,
			amount: 5,
			isRequired: false,
			displayOrder: 1,
			feeType,
			feeTypeId: 2,
		}

		const player = createRegisteredPlayer({
			slot: createSlot({ id: 10 }),
			fees: [
				{
					id: 2,
					registrationSlotId: 10,
					paymentId: 1,
					amount: 5,
					isPaid: true,
					eventFeeId: 51,
					eventFee,
				},
			],
		})

		const context = createContext({
			event: createCompleteEvent({ eventFees: [eventFee] }),
			group: [player],
		})

		const result = transformer.transformToGgMember(player, context)

		expect(result.custom_fields.bhmc_skins_indiv).toBe("5")
	})

	it("sets fee amount to '0' when fee is not paid", () => {
		const feeType = {
			id: 1,
			name: "Skins",
			code: "SK",
			payout: "Cash" as const,
			restriction: "None" as const,
		}
		const eventFee = {
			id: 50,
			eventId: 100,
			amount: 10,
			isRequired: false,
			displayOrder: 1,
			feeType,
			feeTypeId: 1,
		}

		const player = createRegisteredPlayer({
			slot: createSlot({ id: 10 }),
			fees: [
				{
					id: 1,
					registrationSlotId: 10,
					paymentId: 1,
					amount: 10,
					isPaid: false,
					eventFeeId: 50,
					eventFee,
				},
			],
		})

		const context = createContext({
			event: createCompleteEvent({ eventFees: [eventFee] }),
			group: [player],
		})

		const result = transformer.transformToGgMember(player, context)

		expect(result.custom_fields.bhmc_skins).toBe("0")
	})
})
