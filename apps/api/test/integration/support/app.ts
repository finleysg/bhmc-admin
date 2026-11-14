import cookieParser from "cookie-parser"
import request from "supertest"
import type { App } from "supertest/types"

import { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import type { DjangoUser } from "@repo/domain/types"

import { AppModule } from "../../../src/app.module"
import { DjangoAuthService } from "../../../src/auth/django-auth.service"
import { MailService } from "../../../src/mail/mail.service"
import { StripeService } from "../../../src/stripe/stripe.service"

/** Every property is a jest.fn() resolving to undefined, created on first access. */
export type Fake = Record<string, jest.Mock>

function createFake(): Fake {
	const fns = new Map<string, jest.Mock>()
	return new Proxy(
		{},
		{
			get(_, prop) {
				if (typeof prop !== "string" || prop === "then") return undefined
				if (!fns.has(prop)) fns.set(prop, jest.fn().mockResolvedValue(undefined))
				return fns.get(prop)
			},
		},
	)
}

export interface TestApp {
	app: INestApplication
	/** Fakes for the services that reach outside the process. */
	mail: Fake
	stripe: Fake
	/** Supertest client; pass a user to send their auth token. */
	http(user?: DjangoUser): {
		get: (url: string) => request.Test
		post: (url: string) => request.Test
		put: (url: string) => request.Test
		patch: (url: string) => request.Test
		delete: (url: string) => request.Test
	}
	close(): Promise<void>
}

/**
 * Boots the real AppModule against the test database. Only the Django token
 * check, mail, and Stripe are replaced.
 */
export async function createTestApp(
	options: {
		/** Extra providers to replace, e.g. [[ALERT_SOURCES, [fakeSource]]]. */
		overrides?: [token: unknown, value: unknown][]
	} = {},
): Promise<TestApp> {
	const users = new Map<string, DjangoUser>()
	const mail = createFake()
	const stripe = createFake()

	const builder = Test.createTestingModule({ imports: [AppModule] })
		.overrideProvider(DjangoAuthService)
		.useValue({ validateToken: (token: string) => Promise.resolve(users.get(token) ?? null) })
		.overrideProvider(MailService)
		.useValue(mail)
		.overrideProvider(StripeService)
		.useValue(stripe)
	for (const [token, value] of options.overrides ?? []) {
		builder.overrideProvider(token).useValue(value)
	}
	const moduleRef = await builder.compile()

	const app = moduleRef.createNestApplication({ logger: ["error"] })
	app.use(cookieParser())
	await app.init()

	const http = (user?: DjangoUser) => {
		const server = request(app.getHttpServer() as App)
		const withAuth = (req: request.Test) => {
			if (!user) return req
			const token = `test-token-${user.id}`
			users.set(token, user)
			return req.set("Authorization", `Token ${token}`)
		}
		return {
			get: (url: string) => withAuth(server.get(url)),
			post: (url: string) => withAuth(server.post(url)),
			put: (url: string) => withAuth(server.put(url)),
			patch: (url: string) => withAuth(server.patch(url)),
			delete: (url: string) => withAuth(server.delete(url)),
		}
	}

	return { app, mail, stripe, http, close: () => app.close() }
}
