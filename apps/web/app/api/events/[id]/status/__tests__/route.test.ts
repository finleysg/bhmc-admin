/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { GET } from "../route"

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Store original env
const originalEnv = process.env

const createMockRequest = (token?: string): NextRequest => {
	const req = new NextRequest("http://localhost/api/events/1/status")
	if (token) {
		// NextRequest cookies are read-only, we need to create with headers
		const headers = new Headers()
		headers.set("cookie", `access_token=${token}`)
		return new NextRequest("http://localhost/api/events/1/status", { headers })
	}
	return req
}

const createMockEvent = (overrides = {}) => ({
	id: 1,
	name: "Test Event",
	eventType: "N",
	startDate: "2024-06-01",
	startTime: "8:00 AM",
	startType: "TT",
	canChoose: true,
	ggId: "GG-123",
	signupStart: null,
	signupEnd: null,
	paymentsEnd: null,
	prioritySignupStart: null,
	...overrides,
})

describe("GET /api/events/[id]/status", () => {
	beforeEach(() => {
		jest.clearAllMocks()
		process.env = {
			...originalEnv,
			DJANGO_API_URL: "http://django-api",
			API_URL: "http://nest-api",
		}
	})

	afterEach(() => {
		process.env = originalEnv
	})

	it("returns 400 when event ID is missing", async () => {
		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "" }) })
		expect(response.status).toBe(400)
		const json = await response.json()
		expect(json.error).toBe("Event ID is required")
	})

	it("returns 401 when no auth token", async () => {
		const req = createMockRequest()
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(401)
		const json = await response.json()
		expect(json.error).toBe("Unauthorized")
	})

	it("returns 500 when DJANGO_API_URL not configured", async () => {
		delete process.env.DJANGO_API_URL
		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(500)
		const json = await response.json()
		expect(json.error).toBe("API URLs not configured")
	})

	it("returns 500 when API_URL not configured", async () => {
		delete process.env.API_URL
		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(500)
		const json = await response.json()
		expect(json.error).toBe("API URLs not configured")
	})

	it("returns 404 when event not found", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
		})

		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "999" }) })
		expect(response.status).toBe(404)
		const json = await response.json()
		expect(json.error).toBe("Event not found")
	})

	it("returns event status with all data when all fetches succeed", async () => {
		const mockEvent = createMockEvent()
		const mockDocuments = [
			{ id: 1, event: 1 },
			{ id: 2, event: 1 },
		]
		const mockSpots = { availableSpots: 8, totalSpots: 40 }

		mockFetch
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEvent) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDocuments) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSpots) })

		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(200)
		const json = await response.json()
		expect(json.event).toEqual(mockEvent)
		expect(json.documentsCount).toBe(2)
		expect(json.availableSpots).toBe(8)
		expect(json.totalSpots).toBe(40)
	})

	it("defaults documentsCount to 0 when documents fetch fails", async () => {
		const mockEvent = createMockEvent()
		const mockSpots = { availableSpots: 8, totalSpots: 40 }

		mockFetch
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEvent) })
			.mockResolvedValueOnce({ ok: false, status: 500 })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSpots) })

		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(200)
		const json = await response.json()
		expect(json.documentsCount).toBe(0)
		expect(json.availableSpots).toBe(8)
		expect(json.totalSpots).toBe(40)
	})

	it("defaults spots to 0 when available spots fetch fails", async () => {
		const mockEvent = createMockEvent()
		const mockDocuments = [{ id: 1, event: 1 }]

		mockFetch
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEvent) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDocuments) })
			.mockResolvedValueOnce({ ok: false, status: 500 })

		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(200)
		const json = await response.json()
		expect(json.documentsCount).toBe(1)
		expect(json.availableSpots).toBe(0)
		expect(json.totalSpots).toBe(0)
	})

	it("returns 500 on fetch exception", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"))

		const req = createMockRequest("token123")
		const response = await GET(req, { params: Promise.resolve({ id: "1" }) })
		expect(response.status).toBe(500)
		const json = await response.json()
		expect(json.error).toBe("Internal server error")
	})
})
