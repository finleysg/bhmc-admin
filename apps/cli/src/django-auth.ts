import { CliError, responseMessage } from "./errors"

/** Logs in with Django (djoser) and returns the operator's token. */
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
	const { auth_token } = (await res.json()) as { auth_token: string }
	return auth_token
}

/** Revokes the token with Django. A token that's already invalid is not an error. */
export async function djangoLogout(djangoUrl: string, token: string): Promise<void> {
	const res = await fetch(`${djangoUrl}/auth/token/logout/`, {
		method: "POST",
		headers: { Authorization: `Token ${token}` },
	})
	if (!res.ok && res.status !== 401) throw new CliError(await responseMessage(res), res.status)
}
