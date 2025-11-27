import { validateRegistration } from "../functions/registration-validation"
import { RegistrationSlot } from "../types"
import { Course } from "../types/courses/course"
import { Hole as CourseHole } from "../types/courses/hole"
import { Tee } from "../types/courses/tee"
import { EventFee } from "../types/events/event-fee"
import { Player } from "../types/register/player"
import { Registration } from "../types/register/registration"
import { RegistrationFee } from "../types/register/registration-fee"

describe("validateRegistration", () => {
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
		// other fields optional
	}

	const validTee: Tee = {
		id: 1,
		name: "Blue",
		courseId: 1,
		// other fields
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

	const validFee: EventFee = {
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
		eventFee: validFee,
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
		course: validCourse,
		slots: [validSlot],
	}

	it("validates full registration with course details", () => {
		const result = validateRegistration(validRegistration)
		expect(result).toBeDefined()
		expect(result).toEqual(validRegistration)
	})

	it("validates registration without course details", () => {
		const partialReg: Registration = {
			...validRegistration,
			course: undefined,
			courseId: undefined,
			slots: [
				{
					...validSlot,
					holeId: null as unknown as number | null,
					hole: undefined,
				},
			],
		}
		const result = validateRegistration(partialReg)
		expect(result).toBeDefined()
	})

	it("fails if registration id is missing", () => {
		const invalidReg = { ...validRegistration, id: undefined } as unknown as Registration
		expect(validateRegistration(invalidReg)).toBeNull()
	})

	it("fails if slots empty", () => {
		const invalidReg: Registration = {
			...validRegistration,
			slots: [],
		}
		expect(validateRegistration(invalidReg)).toBeNull()
	})

	it("fails if slot missing id", () => {
		const invalidSlot = { ...validSlot, id: null } as unknown as RegistrationSlot
		const invalidReg: Registration = {
			...validRegistration,
			slots: [invalidSlot],
		}
		expect(validateRegistration(invalidReg)).toBeNull()
	})

	it("fails if player missing an id", () => {
		const invalidPlayer: Player = {
			...validPlayer,
			id: undefined,
		}
		const invalidSlot: RegistrationSlot = {
			...validSlot,
			player: invalidPlayer,
		}
		const invalidReg: Registration = {
			...validRegistration,
			slots: [invalidSlot],
		}
		expect(validateRegistration(invalidReg)).toBeNull()
	})

	it("fails if course required but missing", () => {
		const invalidReg: Registration = {
			...validRegistration,
			course: undefined,
		}
		expect(validateRegistration(invalidReg)).toBeNull()
	})

	it("fails if courseId mismatch", () => {
		const invalidReg: Registration = {
			...validRegistration,
			courseId: 2,
			course: {
				...validCourse,
				id: 1,
			},
		}
		expect(validateRegistration(invalidReg)).toBeNull()
	})

	it("validates optional player (no player in slot)", () => {
		const slotNoPlayer: RegistrationSlot = {
			...validSlot,
			player: undefined,
		}
		const regNoPlayer: Registration = {
			...validRegistration,
			slots: [slotNoPlayer],
		}
		const result = validateRegistration(regNoPlayer)
		expect(result).toBeDefined()
	})

	it("validates optional fees", () => {
		const slotNoFees: RegistrationSlot = {
			...validSlot,
			fees: undefined,
		}
		const regNoFees: Registration = {
			...validRegistration,
			slots: [slotNoFees],
		}
		const result = validateRegistration(regNoFees)
		expect(result).toBeDefined()
	})
})
