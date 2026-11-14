import { homedir } from "node:os"
import { join } from "node:path"

/** Where the CLI connects, from the environment (defaults: the local docker stack). */
export interface CliConfig {
	apiUrl: string
	djangoUrl: string
	credentialsPath: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CliConfig {
	return {
		apiUrl: (env.BHMC_API_URL ?? "http://localhost:3333").replace(/\/$/, ""),
		djangoUrl: (env.BHMC_DJANGO_URL ?? "http://localhost:8000").replace(/\/$/, ""),
		credentialsPath: env.BHMC_CREDENTIALS ?? join(homedir(), ".config", "bhmc", "credentials.json"),
	}
}
