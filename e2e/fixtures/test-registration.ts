const DJANGO_URL = process.env.DJANGO_URL ?? "http://localhost:8000"
const API_URL = process.env.API_URL ?? "http://localhost:3333"

interface EventDetail {
	id: number
	courses: { id: number; name: string }[]
	fees: { id: number; is_required: boolean }[]
}

interface AvailableSlotGroup {
	holeId: number
	holeNumber: number
	startingOrder: number
	slots: { id: number }[]
}

export interface TestRegistration {
	registrationId: number
	paymentId: number
	courseId: number
	holeId: number
	startingOrder: number
	slotIds: number[]
}

interface TestMember {
	player_id: number
	user_id: number
	first_name: string
	last_name: string
}

async function getEventDetail(token: string, eventId: number): Promise<EventDetail> {
	const res = await fetch(`${DJANGO_URL}/api/events/${eventId}/`, {
		headers: { Authorization: `Token ${token}` },
	})
	if (!res.ok) {
		throw new Error(`Failed to get event detail (${res.status}): ${await res.text()}`)
	}
	return res.json() as Promise<EventDetail>
}

export async function createTestRegistration(
	token: string,
	eventId: number,
	members: TestMember[],
): Promise<TestRegistration> {
	// 1. Get event detail for courseId and required feeIds
	const event = await getEventDetail(token, eventId)
	const courseId = event.courses[0]!.id
	const requiredFeeIds = event.fees.filter((f) => f.is_required).map((f) => f.id)

	// 2. Get available slots
	const slotsRes = await fetch(
		`${API_URL}/registration/${eventId}/available-slots?courseId=${courseId}&players=${members.length}`,
		{ headers: { Authorization: `Token ${token}` } },
	)
	if (!slotsRes.ok) {
		throw new Error(`Failed to get available slots (${slotsRes.status}): ${await slotsRes.text()}`)
	}
	const groups = (await slotsRes.json()) as AvailableSlotGroup[]
	const group = groups[0]
	if (!group || group.slots.length < members.length) {
		throw new Error(
			`Not enough available slots (need ${members.length}, found ${group?.slots.length ?? 0})`,
		)
	}

	const slotIds = group.slots.slice(0, members.length).map((s) => s.id)

	// 3. Create test registration (slots RESERVED, payment confirmed)
	const owner = members[0]!
	const payload = {
		userId: owner.user_id,
		signedUpBy: `${owner.first_name} ${owner.last_name}`,
		courseId,
		startingHoleId: group.holeId,
		startingOrder: group.startingOrder,
		expires: 24,
		slots: members.map((m, i) => ({
			slotId: slotIds[i]!,
			playerId: m.player_id,
			feeIds: requiredFeeIds,
		})),
	}

	const regRes = await fetch(`${API_URL}/registration/${eventId}/test-registration`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Token ${token}`,
		},
		body: JSON.stringify(payload),
	})
	if (!regRes.ok) {
		throw new Error(
			`Failed to create admin registration (${regRes.status}): ${await regRes.text()}`,
		)
	}

	const result = (await regRes.json()) as { registrationId: number; paymentId: number }

	return {
		registrationId: result.registrationId,
		paymentId: result.paymentId,
		courseId,
		holeId: group.holeId,
		startingOrder: group.startingOrder,
		slotIds,
	}
}
