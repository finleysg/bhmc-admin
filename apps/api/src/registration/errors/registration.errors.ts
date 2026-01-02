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
	constructor(playerId: number, eventId: number) {
		super(`Player ${playerId} is already registered for event ${eventId}`, HttpStatus.BAD_REQUEST)
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

export class PaymentNotFoundError extends HttpException {
	constructor(paymentId: number) {
		super(
			`No payment found for ID ${paymentId}. Your registration may have timed out.`,
			HttpStatus.NOT_FOUND,
		)
	}
}
