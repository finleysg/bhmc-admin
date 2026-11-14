import type { CliConfig } from "./config"
import type { CredentialStore } from "./credentials"
import { CliError, responseMessage } from "./errors"

/**
 * Calls the NestJS admin API as the logged-in operator. Every request sends
 * X-Admin-Client: cli, so the audit record shows the change came from the CLI.
 */
export class ApiClient {
	constructor(
		private readonly config: CliConfig,
		private readonly credentials: CredentialStore,
	) {}

	async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const credential = await this.credentials.get(this.config.apiUrl)
		if (!credential) {
			throw new CliError(`Not logged in to ${this.config.apiUrl}. Run: bhmc login`)
		}

		const res = await fetch(`${this.config.apiUrl}${path}`, {
			method,
			headers: {
				Authorization: `Token ${credential.token}`,
				"Content-Type": "application/json",
				"X-Admin-Client": "cli",
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		})
		if (res.status === 401) {
			throw new CliError("Your login has expired or was revoked. Run: bhmc login", 401)
		}
		if (!res.ok) throw new CliError(await responseMessage(res), res.status)
		return (await res.json()) as T
	}

	get<T>(path: string): Promise<T> {
		return this.request<T>("GET", path)
	}
}
