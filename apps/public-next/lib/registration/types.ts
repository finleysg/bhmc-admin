// Registration flow types — plain interfaces (no classes)

// --- Step and mode types ---

export type RegistrationMode = "new" | "edit" | "idle"

export type RegistrationStep = "pending" | "reserve" | "register" | "review" | "payment" | "complete"

export const PendingStep: RegistrationStep = "pending"
export const ReserveStep: RegistrationStep = "reserve"
export const RegisterStep: RegistrationStep = "register"
export const ReviewStep: RegistrationStep = "review"
export const PaymentStep: RegistrationStep = "payment"
export const CompleteStep: RegistrationStep = "complete"

// --- Code constants ---

export const StartType = {
	Shotgun: "SG",
	TeeTimes: "TT",
	NA: "NA",
} as const

export const RegistrationStatus = {
	Available: "A",
	InProgress: "P",
	Reserved: "R",
	Processing: "X",
	Unavailable: "U",
} as const

export const FeeRestriction = {
	Members: "Members",
	ReturningMembers: "Returning Members",
	NewMembers: "New Members",
	Seniors: "Seniors",
	NonSeniors: "Non-Seniors",
	NonMembers: "Non-Members",
	None: "None",
} as const

// --- Server response types (camelCase from NestJS) ---

export interface ServerPlayer {
	id: number
	email: string | null
	firstName: string
	lastName: string
	ghin: string | null
	birthDate: string | null
	phoneNumber: string | null
	tee: string | null
	isMember: boolean | number
	lastSeason: number | null
}

export interface ServerRegistrationFee {
	id: number
	eventFeeId: number
	registrationSlotId: number | null
	paymentId: number | null
	isPaid: boolean
	amount: string | null
}

export interface ServerRegistrationSlot {
	id: number
	eventId: number
	registrationId: number | null
	holeId: number | null
	player: ServerPlayer | null
	startingOrder: number
	slot: number
	status: string
	fees: ServerRegistrationFee[]
}

export interface ServerRegistration {
	id: number
	eventId: number
	courseId: number | null
	signedUpBy: string
	expires: string
	notes: string | null
	createdDate: string
	slots: ServerRegistrationSlot[]
}

// --- Payment types ---

export interface ServerPaymentDetail {
	id: number
	eventFeeId: number
	registrationSlotId: number | null
	paymentId: number
	isPaid: boolean | null
	amount: number | null
}

export interface ServerPayment {
	id: number
	eventId: number
	userId: number | null
	paymentCode: string
	paymentKey: string | null
	paymentAmount: number | null
	transactionFee: number | null
	notificationType: string | null
	confirmed: boolean
	details: ServerPaymentDetail[]
}

export interface PaymentAmount {
	subtotal: number
	transactionFee: number
	total: number
}

export interface StripeAmountResponse {
	amountDue: PaymentAmount
	amountCents: number
}

export interface CustomerSessionResponse {
	clientSecret: string
}

// --- SSE types (camelCase from NestJS) ---

export interface SSESlotData {
	id: number
	eventId: number
	registrationId: number | null
	holeId: number | null
	player: ServerPlayer | null
	startingOrder: number
	slot: number
	status: string
	fees: ServerRegistrationFee[]
}

export interface SSEUpdateEvent {
	eventId: number
	timestamp: string
	slots: SSESlotData[]
	currentWave: number
}
