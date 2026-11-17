import { PublicSiteService } from "../public-site.service"

describe("PublicSiteService", () => {
	const fetchMock = jest.fn()
	const original = process.env.PUBLIC_NEXT_URL

	beforeEach(() => {
		global.fetch = fetchMock
		fetchMock.mockReset()
		process.env.PUBLIC_NEXT_URL = "http://public.test"
	})

	afterAll(() => {
		process.env.PUBLIC_NEXT_URL = original
	})

	it("posts each tag to the public site's revalidate route", async () => {
		fetchMock.mockResolvedValue({ ok: true })

		await new PublicSiteService().revalidate(["events", "event-slots-7"])

		expect(fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)])).toEqual([
			["http://public.test/api/revalidate", { tag: "events" }],
			["http://public.test/api/revalidate", { tag: "event-slots-7" }],
		])
	})

	it("does nothing without PUBLIC_NEXT_URL", async () => {
		delete process.env.PUBLIC_NEXT_URL
		await new PublicSiteService().revalidate(["events"])
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("never throws when the public site is down", async () => {
		fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))
		await expect(new PublicSiteService().revalidate(["events"])).resolves.toBeUndefined()
	})
})
