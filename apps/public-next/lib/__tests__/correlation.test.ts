import { getCorrelationId } from "../registration/correlation"

describe("getCorrelationId", () => {
	let mockStorage: Record<string, string>
	let setItemSpy: jest.SpyInstance

	beforeEach(() => {
		mockStorage = {}
		jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => mockStorage[key] ?? null)
		setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
			mockStorage[key] = value
		})
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it("generates a 12-character alphanumeric ID", () => {
		const id = getCorrelationId(1)
		expect(id).toHaveLength(12)
		expect(id).toMatch(/^[A-Za-z0-9]{12}$/)
	})

	it("caches the ID per event", () => {
		const first = getCorrelationId(42)
		const second = getCorrelationId(42)
		expect(first).toBe(second)
	})

	it("returns different IDs for different events", () => {
		const id1 = getCorrelationId(1)
		const id2 = getCorrelationId(2)
		expect(id1).not.toBe(id2)
	})

	it("stores the ID in localStorage with event-specific key", () => {
		getCorrelationId(99)
		expect(setItemSpy).toHaveBeenCalledWith("99-correlation-id", expect.any(String))
	})

	it("returns cached value from localStorage", () => {
		mockStorage["5-correlation-id"] = "existingValue1"
		const id = getCorrelationId(5)
		expect(id).toBe("existingValue1")
		expect(setItemSpy).not.toHaveBeenCalled()
	})
})
