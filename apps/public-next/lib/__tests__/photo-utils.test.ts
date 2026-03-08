const ORIGINAL_ENV = process.env

beforeEach(() => {
	jest.resetModules()
	process.env = { ...ORIGINAL_ENV }
})

afterAll(() => {
	process.env = ORIGINAL_ENV
})

describe("resolvePhotoUrl", () => {
	it("returns absolute URLs as-is", async () => {
		const { resolvePhotoUrl } = await import("../photo-utils")
		expect(resolvePhotoUrl("https://s3.amazonaws.com/photos/1.jpg")).toBe(
			"https://s3.amazonaws.com/photos/1.jpg",
		)
	})

	it("returns http URLs as-is", async () => {
		const { resolvePhotoUrl } = await import("../photo-utils")
		expect(resolvePhotoUrl("http://example.com/photo.jpg")).toBe("http://example.com/photo.jpg")
	})

	it("prefixes relative URLs with Django URL", async () => {
		process.env.NEXT_PUBLIC_DJANGO_URL = "https://data.bhmc.org"
		const { resolvePhotoUrl } = await import("../photo-utils")
		expect(resolvePhotoUrl("/media/photos/1.jpg")).toBe("https://data.bhmc.org/media/photos/1.jpg")
	})

	it("uses localhost fallback when env var is not set", async () => {
		delete process.env.NEXT_PUBLIC_DJANGO_URL
		const { resolvePhotoUrl } = await import("../photo-utils")
		expect(resolvePhotoUrl("/media/photos/1.jpg")).toBe("http://localhost:8000/media/photos/1.jpg")
	})
})
