import { CliError, responseMessage } from "./errors"

/**
 * Logs in with Django and returns the operator's token, which Django sends as the
 * httponly `access_token` cookie (the browser sites never see it in the body).
 */
export async function djangoLogin(
	djangoUrl: string,
	email: string,
	password: string,
): Promise<string> {
	const res = await fetch(`${djangoUrl}/auth/token/login/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	})
	if (!res.ok) throw new CliError(await responseMessage(res), res.status)
	const cookie = res.headers.getSetCookie().find((c) => c.startsWith("access_token="))
	const token = cookie?.slice("access_token=".length).split(";")[0]
	if (!token) throw new CliError("Django's login response had no access_token cookie")
	return decodeURIComponent(token)
}

/** Revokes the token with Django. A token that's already invalid is not an error. */
export async function djangoLogout(djangoUrl: string, token: string): Promise<void> {
	const res = await fetch(`${djangoUrl}/auth/token/logout/`, {
		method: "POST",
		headers: { Authorization: `Token ${token}` },
	})
	if (!res.ok && res.status !== 401) throw new CliError(await responseMessage(res), res.status)
}
