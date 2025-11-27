import { validateRegisteredPlayer } from "../functions/registration-validation"
import { Course } from "../types/courses/course"
import { Hole as CourseHole } from "../types/courses/hole"
import { Tee } from "../types/courses/tee"
import { EventFee } from "../types/events/event-fee"
import { Player } from "../types/register/player"
import { RegisteredPlayer } from "../types/register/registered-player"
import { Registration } from "../types/register/registration"
import { RegistrationFee } from "../types/register/registration-fee"
import { RegistrationSlot } from "../types/register/registration-slot"

describe("validateRegisteredPlayer", () => {
	const validPlayer: Player = {
		id: 1,
		firstName: "John",
		lastName: "Doe",
		email: "john@example.com",
		tee: "Blue",
		isMember: true,
	}

	const validHole: CourseHole = {
		id: 1,
		holeNumber: 1,
		par: 4,
		courseId: 1,
	}

	const validTee: Tee = {
		id: 1,
		name: "Blue",
		courseId: 1,
	}

	const validCourse: Course = {
		id: 1,
		name: "Test Course",
		numberOfHoles: 18,
		holes: [validHole],
		tees: [validTee],
	}

	const validFeeType = {
		id: 1,
		name: "Greens Fee",
		code: "GREENS",
		payout: "CLUB",
		restriction: "ALL",
	}

	const validEventFee: EventFee = {
		id: 1,
		eventId: 1,
		amount: 50,
		isRequired: true,
		displayOrder: 1,
		feeTypeId: 1,
		feeType: validFeeType,
	}

	const validRegistrationFee: RegistrationFee = {
		id: 1,
		registrationSlotId: 1,
		paymentId: 1,
		amount: 50,
		isPaid: true,
		eventFeeId: 1,
		eventFee: validEventFee,
	}

	const validSlot: RegistrationSlot = {
		id: 1,
		registrationId: 1,
		eventId: 1,
		startingOrder: 0,
		slot: 1,
		status: "R",
		holeId: 1,
		hole: validHole,
		player: validPlayer,
		fees: [validRegistrationFee],
	}

	const validRegistration: Registration = {
		id: 1,
		eventId: 1,
		startingHole: 1,
		startingOrder: 0,
		signedUpBy: "user@example.com",
		userId: 1,
		createdDate: "2023-01-01T00:00:00Z",
		courseId: 1,
	}

	const validRegisteredPlayer: RegisteredPlayer = {
		slot: validSlot,
		player: validPlayer,
		registration: validRegistration,
		course: validCourse,
		hole: validHole,
		fees: [validRegistrationFee],
	}

	it("validates full registered player with course details", () => {
		const result = validateRegisteredPlayer(validRegisteredPlayer)
		expect(result).toBeDefined()
		expect(result).toEqual(validRegisteredPlayer)
	})

	it("validates registered player without course details when registration has no courseId", () => {
		const partialPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			course: undefined,
			registration: { ...validRegistration, courseId: undefined },
		}
		const result = validateRegisteredPlayer(partialPlayer)
		expect(result).toBeDefined()
	})

	it("validates registered player without fees", () => {
		const playerNoFees: RegisteredPlayer = {
			...validRegisteredPlayer,
			fees: undefined,
		}
		const result = validateRegisteredPlayer(playerNoFees)
		expect(result).toBeDefined()
	})

	it("fails if registered player is null", () => {
		expect(() => validateRegisteredPlayer(null as unknown as RegisteredPlayer)).toThrow()
	})

	it("fails if slot missing", () => {
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			slot: undefined,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if slot missing id", () => {
		const invalidSlot = { ...validSlot, id: null } as unknown as RegistrationSlot
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			slot: invalidSlot,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if player missing", () => {
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			player: undefined,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if player missing id", () => {
		const invalidPlayerData: Player = {
			...validPlayer,
			id: null as unknown as number,
		}
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			player: invalidPlayerData,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if registration missing", () => {
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			registration: undefined,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if registration missing id", () => {
		const invalidReg: Registration = {
			...validRegistration,
			id: null as unknown as number,
		}
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			registration: invalidReg,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if course required but missing", () => {
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			course: undefined,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if course required but invalid", () => {
		const invalidCourse: Course = {
			...validCourse,
			id: undefined,
		}
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			course: invalidCourse,
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if fees array is empty", () => {
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			fees: [],
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})

	it("fails if fees have invalid structure", () => {
		const invalidFee: RegistrationFee = {
			...validRegistrationFee,
			eventFee: {
				...validEventFee,
				feeType: undefined,
			},
		}
		const invalidPlayer: RegisteredPlayer = {
			...validRegisteredPlayer,
			fees: [invalidFee],
		}
		expect(() => validateRegisteredPlayer(invalidPlayer)).toThrow()
	})
})
