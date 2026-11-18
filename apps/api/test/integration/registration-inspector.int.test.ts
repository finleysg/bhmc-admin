import { eq } from "drizzle-orm"

import {
	RegistrationStatusChoices,
	type InspectorSearchResult,
	type RegistrationInspection,
} from "@repo/domain/types"

import {
	adminAuditEntry,
	eventFee,
	feeType,
	payment,
	refund,
	registration,
	registrationFee,
	registrationSlot,
} from "../../src/database"
import { createTestApp, TestApp } from "./support/app"
import { closeTestDb, resetDb, testDb } from "./support/db"
import { createEvent, createRegistration, createUser, type TestUser } from "./support/factories"

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ")

describe("Registration Inspector", () => {
	let t: TestApp

	beforeAll(async () => {
		t = await createTestApp()
	})

	beforeEach(async () => {
		await resetDb()
		jest.clearAllMocks()
	})

	afterAll(async () => {
		await t.close()
		await closeTestDb()
	})

	const db = () => testDb()
	const slot = async (id: number) =>
		(await db().select().from(registrationSlot).where(eq(registrationSlot.id, id)))[0]
	const audits = () => db().select().from(adminAuditEntry).orderBy(adminAuditEntry.id)

	async function eventFeeOf(eventId: number) {
		const [row] = await db().select().from(eventFee).where(eq(eventFee.eventId, eventId))
		return row
	}

	/** A Stripe payment of the event's fee for the slot. */
	async function payFee(
		eventId: number,
		user: TestUser,
		slotId: number,
		options: { code?: string; confirmed?: boolean; isPaid?: boolean } = {},
	) {
		const fee = await eventFeeOf(eventId)
		const [p] = await db()
			.insert(payment)
			.values({
				paymentCode: options.code ?? "pi_test_123",
				paymentKey: "pi_test_123_secret",
				confirmed: options.confirmed === false ? 0 : 1,
				eventId,
				userId: user.id,
				paymentAmount: "15.00",
				transactionFee: "0.74",
				paymentDate: now(),
			})
		const [f] = await db()
			.insert(registrationFee)
			.values({
				isPaid: options.isPaid === false ? 0 : 1,
				eventFeeId: fee.id,
				paymentId: p.insertId,
				registrationSlotId: slotId,
				amount: "15.00",
			})
		return { paymentId: p.insertId, feeId: f.insertId, eventFeeId: fee.id }
	}

	const intent = (overrides: Record<string, unknown> = {}) => ({
		id: "pi_test_123",
		status: "succeeded",
		amount: 1574,
		latest_charge: { amount_refunded: 0 },
		...overrides,
	})

	describe("access", () => {
		it("is for Event Admins", async () => {
			const member = await createUser()
			const evt = await createEvent()
			const res = await t.http(member).get(`/registration-inspector/events/${evt.id}/search?q=Test`)
			expect(res.status).toBe(403)
		})
	})

	describe("GET /registration-inspector/events/:eventId/search", () => {
		it("finds the event's registrations of a player, by name, GHIN, or email", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const [a, b] = [await createUser(), await createUser()]
			const evt = await createEvent()
			const other = await createEvent()
			const reg = await createRegistration(evt.id, [a, b])
			await createRegistration(evt.id, [await createUser()])
			// The same player in another event is not found.
			await createRegistration(other.id, [a])

			const res = await t
				.http(admin)
				.get(`/registration-inspector/events/${evt.id}/search?q=${a.email}`)

			expect(res.status).toBe(200)
			expect(res.body).toEqual([
				expect.objectContaining({
					registrationId: reg.id,
					players: [`${a.firstName} ${a.lastName}`, `${b.firstName} ${b.lastName}`],
				}),
			])
		})

		it("lists every registration of the event without a player", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const evt = await createEvent()
			await createRegistration(evt.id, [await createUser()])
			await createRegistration(evt.id, [await createUser()])
			await createRegistration((await createEvent()).id, [await createUser()])

			const res = await t.http(admin).get(`/registration-inspector/events/${evt.id}/search`)

			expect(res.body as InspectorSearchResult[]).toHaveLength(2)
		})
	})

	describe("GET /registration-inspector/events/:eventId/registrations/:id", () => {
		it("shows slots, fees, payments, and the Stripe check", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const paid = await payFee(evt.id, me, reg.slotIds[0], { confirmed: false })
			t.stripe.retrievePaymentIntent.mockResolvedValue(intent())
			t.stripe.paymentDashboardUrl.mockReturnValue(
				"https://dashboard.stripe.com/test/payments/pi_test_123",
			)

			const res = await t
				.http(admin)
				.get(`/registration-inspector/events/${evt.id}/registrations/${reg.id}`)

			expect(res.status).toBe(200)
			const body = res.body as RegistrationInspection
			expect(body.slots).toEqual([
				expect.objectContaining({
					id: reg.slotIds[0],
					status: RegistrationStatusChoices.RESERVED,
					fees: [expect.objectContaining({ id: paid.feeId, amount: 15, isPaid: true })],
				}),
			])
			expect(body.payments).toHaveLength(1)
			expect(body.payments[0].stripe).toMatchObject({
				result: "mismatch",
				stripeStatus: "succeeded",
				issues: ["Paid in Stripe but not confirmed in the database"],
			})
			expect(body.payments[0].stripeUrl).toBe(
				"https://dashboard.stripe.com/test/payments/pi_test_123",
			)
			expect(t.stripe.retrievePaymentIntent).toHaveBeenCalledWith("pi_test_123")
		})

		it("reports a refund that never reached Stripe, and skips non-Stripe payments", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const stripePaid = await payFee(evt.id, me, reg.slotIds[0])
			await db().insert(refund).values({
				refundCode: "pending-abc123",
				refundAmount: "15.00",
				confirmed: 0,
				issuerId: admin.id,
				paymentId: stripePaid.paymentId,
			})
			const reg2 = await createRegistration(evt.id, [await createUser()])
			await payFee(evt.id, me, reg2.slotIds[0], { code: "Cash" })
			t.stripe.retrievePaymentIntent.mockResolvedValue(
				intent({ latest_charge: { amount_refunded: 0 } }),
			)

			const res = await t
				.http(admin)
				.get(`/registration-inspector/events/${evt.id}/registrations/${reg.id}`)
			const body = res.body as RegistrationInspection

			// The cash payment is the same user's for the event, so it is listed too.
			const [stripePayment, cash] = body.payments
			expect(stripePayment.refunds[0].stripe.result).toBe("mismatch")
			expect(stripePayment.stripe.issues).toEqual([
				"Stripe refunded $0.00; database refunds total $15.00",
			])
			expect(cash.stripe.result).toBe("not-stripe")
			expect(cash.stripeUrl).toBeNull()
		})

		it("flags a pending hold that has expired", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			await db()
				.update(registrationSlot)
				.set({ status: RegistrationStatusChoices.PENDING })
				.where(eq(registrationSlot.id, reg.slotIds[0]))
			await db()
				.update(registration)
				.set({ expires: "2020-01-01 00:00:00" })
				.where(eq(registration.id, reg.id))

			const res = await t
				.http(admin)
				.get(`/registration-inspector/events/${evt.id}/registrations/${reg.id}`)
			expect(res.body).toMatchObject({ expires: "2020-01-01 00:00:00.000000", holdExpired: true })
		})
	})

	describe("GET .../registrations/:id of another event", () => {
		it("is not found", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const evt = await createEvent()
			const other = await createEvent()
			const reg = await createRegistration(evt.id, [await createUser()])

			const res = await t
				.http(admin)
				.get(`/registration-inspector/events/${other.id}/registrations/${reg.id}`)
			expect(res.status).toBe(404)
		})
	})

	describe("PUT .../slots/:slotId/status", () => {
		it("frees a slot with no paid fees, detaching unpaid fees, and audits it", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const unpaid = await payFee(evt.id, me, reg.slotIds[0], { isPaid: false, confirmed: false })
			t.stripe.retrievePaymentIntent.mockResolvedValue(intent({ status: "canceled" }))

			const res = await t
				.http(admin)
				.put(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/status`)
				.send({ status: "A" })

			expect(res.status).toBe(204)
			expect(await slot(reg.slotIds[0])).toMatchObject({
				status: "A",
				playerId: null,
				registrationId: null,
			})
			const [fee] = await db()
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.id, unpaid.feeId))
			expect(fee.registrationSlotId).toBeNull()
			const [entry] = await audits()
			expect(entry).toMatchObject({
				operation: "registration.slot.status",
				entityType: "registration_slot",
				entityId: reg.slotIds[0],
				eventId: evt.id,
				actorId: admin.id,
				changes: {
					status: { before: "R", after: "A" },
					playerId: { before: me.playerId, after: null },
					registrationId: { before: reg.id, after: null },
					feeIds: { before: [unpaid.feeId], after: [] },
				},
			})
		})

		it.each(["processing", "succeeded", "requires_payment_method"])(
			"refuses to free a slot whose Stripe payment is %s",
			async (stripeStatus) => {
				const admin = await createUser({ roles: ["event-admin"] })
				const me = await createUser()
				const evt = await createEvent()
				const reg = await createRegistration(evt.id, [me])
				await db()
					.update(registrationSlot)
					.set({ status: RegistrationStatusChoices.AWAITING_PAYMENT })
					.where(eq(registrationSlot.id, reg.slotIds[0]))
				await payFee(evt.id, me, reg.slotIds[0], { isPaid: false, confirmed: false })
				t.stripe.retrievePaymentIntent.mockResolvedValue(intent({ status: stripeStatus }))

				const res = await t
					.http(admin)
					.put(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/status`)
					.send({ status: "A" })

				expect(res.status).toBe(409)
				expect((res.body as { message: string }).message).toContain(stripeStatus)
				expect(await slot(reg.slotIds[0])).toMatchObject({
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: me.playerId,
				})
				expect(await audits()).toHaveLength(0)
			},
		)

		it("refuses to free a slot while the player may still be checking out", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			await db()
				.update(registrationSlot)
				.set({ status: RegistrationStatusChoices.PENDING })
				.where(eq(registrationSlot.id, reg.slotIds[0]))
			// No PaymentIntent yet.
			await payFee(evt.id, me, reg.slotIds[0], { code: "pending", isPaid: false, confirmed: false })
			const url = `/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/status`

			await db()
				.update(registration)
				.set({ expires: "2099-01-01 00:00:00" })
				.where(eq(registration.id, reg.id))
			const during = await t.http(admin).put(url).send({ status: "A" })
			expect(during.status).toBe(409)
			expect(t.stripe.retrievePaymentIntent).not.toHaveBeenCalled()

			await db()
				.update(registration)
				.set({ expires: "2020-01-01 00:00:00" })
				.where(eq(registration.id, reg.id))
			const after = await t.http(admin).put(url).send({ status: "A" })
			expect(after.status).toBe(204)
		})

		it("refuses to free a slot with paid fees", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			await payFee(evt.id, me, reg.slotIds[0])

			const res = await t
				.http(admin)
				.put(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/status`)
				.send({ status: "U" })

			expect(res.status).toBe(409)
			expect((await slot(reg.slotIds[0])).status).toBe("R")
			expect(await audits()).toHaveLength(0)
		})

		it("reserves a stuck pending slot", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			await db()
				.update(registrationSlot)
				.set({ status: RegistrationStatusChoices.PENDING })
				.where(eq(registrationSlot.id, reg.slotIds[0]))

			const res = await t
				.http(admin)
				.put(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/status`)
				.send({ status: "R" })

			expect(res.status).toBe(204)
			expect((await slot(reg.slotIds[0])).status).toBe("R")
			expect((await audits())[0].changes).toEqual({ status: { before: "P", after: "R" } })
		})

		it("refuses Reserved for a slot without a player", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const evt = await createEvent()
			const [s] = await db().insert(registrationSlot).values({
				eventId: evt.id,
				status: "A",
				startingOrder: 0,
				slot: 0,
			})

			const res = await t
				.http(admin)
				.put(`/registration-inspector/events/${evt.id}/slots/${s.insertId}/status`)
				.send({ status: "R" })
			expect(res.status).toBe(400)
		})

		it("refuses to free a slot in an event where players don't choose slots", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent({ canChoose: 0 })
			const reg = await createRegistration(evt.id, [me])

			const res = await t
				.http(admin)
				.put(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/status`)
				.send({ status: "A" })
			expect(res.status).toBe(400)
		})

		it("refuses a slot of another event", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const evt = await createEvent()
			const other = await createEvent()
			const reg = await createRegistration(evt.id, [await createUser()])

			const res = await t
				.http(admin)
				.put(`/registration-inspector/events/${other.id}/slots/${reg.slotIds[0]}/status`)
				.send({ status: "U" })
			expect(res.status).toBe(404)
		})
	})

	describe("POST .../slots/:slotId/fees", () => {
		async function secondFee(
			eventId: number,
			overrides: Partial<typeof eventFee.$inferInsert> = {},
		) {
			const [ft] = await db()
				.insert(feeType)
				.values({ name: "Skins", code: "S", payout: "Cash", restriction: "None" })
			const [ef] = await db()
				.insert(eventFee)
				.values({
					eventId,
					feeTypeId: ft.insertId,
					amount: "5.00",
					isRequired: 0,
					displayOrder: 2,
					...overrides,
				})
			return ef.insertId
		}

		it("adds a fee paid outside Stripe, at the player's amount, and audits it", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			// Members pay the override amount.
			const skinsId = await secondFee(evt.id, {
				overrideAmount: "4.00",
				overrideRestriction: "Members",
			})

			const res = await t
				.http(admin)
				.post(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/fees`)
				.send({ eventFeeId: skinsId, paidBy: "Cash" })

			expect(res.status).toBe(204)
			const [fee] = await db()
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.registrationSlotId, reg.slotIds[0]))
			expect(fee).toMatchObject({ eventFeeId: skinsId, amount: "4.00", isPaid: 1 })
			const [p] = await db().select().from(payment).where(eq(payment.id, fee.paymentId))
			expect(p).toMatchObject({
				paymentCode: "Cash",
				paymentKey: "admin",
				paymentAmount: "4.00",
				transactionFee: "0.00",
				confirmed: 1,
				userId: me.id,
			})
			const [entry] = await audits()
			expect(entry).toMatchObject({
				operation: "registration.fee.add",
				entityType: "registration_fee",
				entityId: fee.id,
			})
		})

		it("waives a fee at $0, so it adds nothing to the money collected", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const skinsId = await secondFee(evt.id)

			const res = await t
				.http(admin)
				.post(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/fees`)
				.send({ eventFeeId: skinsId, waived: true })

			expect(res.status).toBe(204)
			const [fee] = await db()
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.registrationSlotId, reg.slotIds[0]))
			expect(fee).toMatchObject({ eventFeeId: skinsId, amount: "0.00", isPaid: 1 })
			const [p] = await db().select().from(payment).where(eq(payment.id, fee.paymentId))
			expect(p).toMatchObject({ paymentCode: "Waived", paymentAmount: "0.00", confirmed: 1 })
		})

		it("refuses a slot that is not Reserved, or a registration still being paid for", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const [me, partner] = [await createUser(), await createUser()]
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me, partner])
			const skinsId = await secondFee(evt.id)
			await db()
				.update(registrationSlot)
				.set({ status: RegistrationStatusChoices.PENDING })
				.where(eq(registrationSlot.id, reg.slotIds[1]))
			const add = (slotId: number) =>
				t
					.http(admin)
					.post(`/registration-inspector/events/${evt.id}/slots/${slotId}/fees`)
					.send({ eventFeeId: skinsId, paidBy: "Cash" })

			// The partner's slot is Pending.
			expect((await add(reg.slotIds[1])).status).toBe(409)
			// My slot is Reserved, but expiry cleanup would still delete the registration's payments.
			expect((await add(reg.slotIds[0])).status).toBe(409)
			expect(await db().select().from(payment)).toHaveLength(0)
		})

		it("requires how it was paid unless waived", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [await createUser()])
			const skinsId = await secondFee(evt.id)

			const res = await t
				.http(admin)
				.post(`/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/fees`)
				.send({ eventFeeId: skinsId })
			expect(res.status).toBe(400)
		})

		it("refuses a fee the player already has, or another event's fee", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const other = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const paid = await payFee(evt.id, me, reg.slotIds[0])
			const url = `/registration-inspector/events/${evt.id}/slots/${reg.slotIds[0]}/fees`

			const dup = await t
				.http(admin)
				.post(url)
				.send({ eventFeeId: paid.eventFeeId, paidBy: "Cash" })
			expect(dup.status).toBe(409)

			const otherFee = await eventFeeOf(other.id)
			const wrong = await t.http(admin).post(url).send({ eventFeeId: otherFee.id, paidBy: "Cash" })
			expect(wrong.status).toBe(400)
		})
	})

	describe("DELETE .../fees/:feeId", () => {
		it("removes a paid fee without a refund, keeping it on its payment", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const paid = await payFee(evt.id, me, reg.slotIds[0])

			const res = await t
				.http(admin)
				.delete(`/registration-inspector/events/${evt.id}/fees/${paid.feeId}`)

			expect(res.status).toBe(204)
			const [fee] = await db()
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.id, paid.feeId))
			expect(fee).toMatchObject({ registrationSlotId: null, isPaid: 1, paymentId: paid.paymentId })
			expect(t.stripe.createRefund).not.toHaveBeenCalled()
			expect((await audits())[0]).toMatchObject({
				operation: "registration.fee.remove",
				changes: { registrationSlotId: { before: reg.slotIds[0], after: null } },
			})
		})

		it("refunds a paid Stripe fee through Stripe, then removes it", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const paid = await payFee(evt.id, me, reg.slotIds[0])
			t.stripe.createRefund.mockResolvedValue("re_test_1")

			const res = await t
				.http(admin)
				.delete(`/registration-inspector/events/${evt.id}/fees/${paid.feeId}?refund=true`)

			expect(res.status).toBe(204)
			expect(t.stripe.createRefund).toHaveBeenCalledWith("pi_test_123", 15)
			const [r] = await db().select().from(refund).where(eq(refund.paymentId, paid.paymentId))
			expect(r).toMatchObject({
				refundCode: "re_test_1",
				refundAmount: "15.00",
				issuerId: admin.id,
			})
			const [fee] = await db()
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.id, paid.feeId))
			expect(fee).toMatchObject({ registrationSlotId: null, isPaid: 0 })
			expect((await audits())[0].changes).toMatchObject({
				isPaid: { before: true, after: false },
				refunded: { before: false, after: true },
			})
		})

		it("refuses a refund of a fee not paid through Stripe", async () => {
			const admin = await createUser({ roles: ["event-admin"] })
			const me = await createUser()
			const evt = await createEvent()
			const reg = await createRegistration(evt.id, [me])
			const paid = await payFee(evt.id, me, reg.slotIds[0], { code: "Cash" })

			const res = await t
				.http(admin)
				.delete(`/registration-inspector/events/${evt.id}/fees/${paid.feeId}?refund=true`)

			expect(res.status).toBe(400)
			expect(t.stripe.createRefund).not.toHaveBeenCalled()
			const [fee] = await db()
				.select()
				.from(registrationFee)
				.where(eq(registrationFee.id, paid.feeId))
			expect(fee.registrationSlotId).toBe(reg.slotIds[0])
		})
	})
})
