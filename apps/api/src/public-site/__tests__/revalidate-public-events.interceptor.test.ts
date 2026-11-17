import type { CallHandler, ExecutionContext } from "@nestjs/common"
import { lastValueFrom, of, throwError } from "rxjs"

import type { PublicSiteService } from "../public-site.service"
import { RevalidatePublicEventsInterceptor } from "../revalidate-public-events.interceptor"

const contextFor = (method: string, params: Record<string, string> = {}) =>
	({ switchToHttp: () => ({ getRequest: () => ({ method, params }) }) }) as ExecutionContext

describe("RevalidatePublicEventsInterceptor", () => {
	const revalidate = jest.fn().mockResolvedValue(undefined)
	const interceptor = new RevalidatePublicEventsInterceptor({
		revalidate,
	} as unknown as PublicSiteService)
	const succeeds: CallHandler = { handle: () => of({ id: 7 }) }

	beforeEach(() => revalidate.mockClear())

	it("clears the events and the event's slots after a change", async () => {
		await lastValueFrom(interceptor.intercept(contextFor("PUT", { eventId: "7" }), succeeds))
		expect(revalidate).toHaveBeenCalledWith(["events", "event-slots-7"])
	})

	it("clears the events after creating one", async () => {
		await lastValueFrom(interceptor.intercept(contextFor("POST"), succeeds))
		expect(revalidate).toHaveBeenCalledWith(["events"])
	})

	it("ignores reads", async () => {
		await lastValueFrom(interceptor.intercept(contextFor("GET", { eventId: "7" }), succeeds))
		expect(revalidate).not.toHaveBeenCalled()
	})

	it("ignores a change that failed", async () => {
		const fails: CallHandler = { handle: () => throwError(() => new Error("409")) }
		await expect(
			lastValueFrom(interceptor.intercept(contextFor("PUT", { eventId: "7" }), fails)),
		).rejects.toThrow("409")
		expect(revalidate).not.toHaveBeenCalled()
	})
})
