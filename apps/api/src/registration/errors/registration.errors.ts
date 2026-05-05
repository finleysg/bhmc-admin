import { HttpException, HttpStatus } from "@nestjs/common"

export class SlotConflictError extends HttpException {
	constructor() {
		super("One or more of the slots you requested have already been reserved", HttpStatus.CONFLICT)
	}
}

export class PlayerConflictError extends HttpException {
	constructor() {
		super(
			"The player selected has already signed up or is in the process of signing up",
			HttpStatus.CONFLICT,
		)
	}
}

export class AlreadyRegisteredError extends HttpException {
	constructor(playerName: string) {
		super(`${playerName} is already registered for this event`, HttpStatus.CONFLICT)
	}
}

export class SlotOverflowError extends HttpException {
	constructor(registrationId: number, slotCount: number) {
		super(
			`Registration ${registrationId} does not have ${slotCount} slots available`,
			HttpStatus.BAD_REQUEST,
		)
	}
}

export class EventFullError extends HttpException {
	constructor() {
		super("The event field is full", HttpStatus.BAD_REQUEST)
	}
}

export class SessionFullError extends HttpException {
	constructor(sessionName: string) {
		super(`The ${sessionName} session is full`, HttpStatus.BAD_REQUEST)
	}
}

export class EventRegistrationNotOpenError extends HttpException {
	constructor() {
		super("The event is not currently open for registration", HttpStatus.BAD_REQUEST)
	}
}

export class EventRegistrationWaveError extends HttpException {
	constructor(wave: number) {
		super(`Wave ${wave} times are not yet open for registration`, HttpStatus.BAD_REQUEST)
	}
}

export class CourseRequiredError extends HttpException {
	constructor() {
		super("A course must be included when registering for this event", HttpStatus.BAD_REQUEST)
	}
}

export class MembersOnlyError extends HttpException {
	constructor(playerName?: string) {
		super(
			playerName
				? `${playerName} is not a member and cannot be added to this event`
				: "This event is restricted to members",
			HttpStatus.FORBIDDEN,
		)
	}
}

export class ReturningMembersOnlyError extends HttpException {
	constructor(playerName?: string) {
		super(
			playerName
				? `${playerName} is not a returning member and cannot be added to this event`
				: "This event is restricted to returning members",
			HttpStatus.FORBIDDEN,
		)
	}
}

export class PaymentNotFoundError extends HttpException {
	constructor(paymentId: number) {
		super(
			`No payment found for ID ${paymentId}. Your registration may have timed out.`,
			HttpStatus.NOT_FOUND,
		)
	}
}

export class PaymentInFlightError extends HttpException {
	constructor(registrationId: number, paymentId: number) {
		super(
			`Cannot cancel registration ${registrationId}: payment ${paymentId} is in flight or already captured. Please wait for confirmation, or contact an administrator if you need a refund.`,
			HttpStatus.CONFLICT,
		)
	}
}

export class OrphanedRegistrationError extends HttpException {
	constructor(registrationId: number, paymentId: number) {
		// Why 500: thrown from the Stripe webhook so Stripe retries delivery
		// (giving any concurrent slot/registration mutation a chance to settle).
		super(
			`Cannot confirm payment ${paymentId} against orphaned registration ${registrationId}. The registration was released before the webhook arrived.`,
			HttpStatus.INTERNAL_SERVER_ERROR,
		)
	}
}
