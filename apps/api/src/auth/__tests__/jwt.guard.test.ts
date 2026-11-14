import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { AdminRole, DjangoUser } from "@repo/domain/types"

import { IS_PUBLIC_KEY } from "../decorators/public.decorator"
import { ROLES_KEY } from "../decorators/roles.decorator"
import { DjangoAuthService } from "../django-auth.service"
import { JwtAuthGuard } from "../jwt.guard"

const createUser = (overrides: Partial<DjangoUser> = {}): DjangoUser => ({
	id: 1,
	email: "admin@example.com",
	firstName: "Ada",
	lastName: "Admin",
	isActive: true,
	isStaff: false,
	isSuperuser: false,
	ghin: null,
	birthDate: null,
	playerId: 1,
	groups: [],
	...overrides,
})

function setup(user: DjangoUser | null, metadata: { roles?: AdminRole[]; isPublic?: boolean }) {
	const reflector = {
		getAllAndOverride: jest.fn((key: string) => {
			if (key === IS_PUBLIC_KEY) return metadata.isPublic
			if (key === ROLES_KEY) return metadata.roles
			return undefined
		}),
	} as unknown as Reflector
	const authService = {
		validateToken: jest.fn().mockResolvedValue(user),
	} as unknown as DjangoAuthService
	const request = { cookies: { access_token: "token" }, headers: {} } as Record<string, unknown>
	const context = {
		getHandler: () => undefined,
		getClass: () => undefined,
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext

	return { guard: new JwtAuthGuard(reflector, authService), context, request }
}

describe("JwtAuthGuard", () => {
	it("allows public routes without a token check", async () => {
		const { guard, context } = setup(null, { isPublic: true })
		await expect(guard.canActivate(context)).resolves.toBe(true)
	})

	it("rejects an invalid token", async () => {
		const { guard, context } = setup(null, {})
		await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
	})

	it("allows any authenticated user when no role is required", async () => {
		const user = createUser()
		const { guard, context, request } = setup(user, { roles: [] })
		await expect(guard.canActivate(context)).resolves.toBe(true)
		expect(request.user).toBe(user)
	})

	it("allows a member of the required role's group", async () => {
		const { guard, context } = setup(createUser({ groups: ["Event Admin"] }), {
			roles: ["event-admin"],
		})
		await expect(guard.canActivate(context)).resolves.toBe(true)
	})

	it("rejects a user without the required role", async () => {
		const { guard, context } = setup(createUser({ groups: ["Club Admin"] }), {
			roles: ["event-admin"],
		})
		await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
	})

	it("rejects a staff user who holds no role", async () => {
		const { guard, context } = setup(createUser({ isStaff: true }), {
			roles: ["event-admin", "club-admin"],
		})
		await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
	})

	it("allows a superuser regardless of groups", async () => {
		const { guard, context } = setup(createUser({ isSuperuser: true }), {
			roles: ["club-admin"],
		})
		await expect(guard.canActivate(context)).resolves.toBe(true)
	})
})
