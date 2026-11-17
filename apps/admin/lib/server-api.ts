import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

/**
 * Server-side access to the NestJS API for Server Components and Server
 * Actions (ADR 0005). Forwards the Django `access_token` cookie.
 */

export type ApiResult<T> =
	| { ok: true; data: T }
	| {
			ok: false
			status: number
			message: string
			/** The API refused a change that an override can make (registration has opened). */
			overridable: boolean
	  }

async function request(path: string, init: RequestInit = {}): Promise<Response> {
	const token = (await cookies()).get("access_token")?.value
	if (!token) redirect("/sign-in")

	const res = await fetch(`${process.env.API_URL}${path}`, {
		...init,
		headers: {
			Authorization: `Token ${token}`,
			"Content-Type": "application/json",
			...init.headers,
		},
		cache: "no-store",
	})
	if (res.status === 401) redirect("/sign-in")
	return res
}

type ErrorBody = { message?: string | string[]; overridable?: boolean } | null

async function errorBody(res: Response): Promise<ErrorBody> {
	return (await res.json().catch(() => null)) as ErrorBody
}

function messageOf(body: ErrorBody, status: number): string {
	const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message
	return message ?? `Request failed (${status})`
}

/**
 * GET for Server Components. 404 renders the not-found page, 403 redirects to
 * /restricted, and any other failure throws to the nearest error boundary.
 */
export async function apiGet<T>(path: string): Promise<T> {
	const res = await request(path)
	if (res.status === 404) notFound()
	if (res.status === 403) redirect("/restricted")
	if (!res.ok) throw new Error(messageOf(await errorBody(res), res.status))
	return (await res.json()) as T
}

/**
 * Any method, returning the outcome instead of throwing, for Server Actions
 * and optional reads. Only a rejected token (401) redirects.
 */
export async function apiRequest<T>(
	path: string,
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
	body?: unknown,
): Promise<ApiResult<T>> {
	const res = await request(path, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
	})
	if (!res.ok) {
		const body = await errorBody(res)
		return {
			ok: false,
			status: res.status,
			message: messageOf(body, res.status),
			overridable: body?.overridable === true,
		}
	}
	if (res.status === 204) return { ok: true, data: undefined as T }
	return { ok: true, data: (await res.json()) as T }
}
