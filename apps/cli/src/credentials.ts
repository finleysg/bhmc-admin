import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

/** A stored login: the operator's Django token, per API URL. */
export interface Credential {
	token: string
	email: string
}

type CredentialFile = Record<string, Credential>

/**
 * The operator's tokens, one per API URL so local and production logins don't
 * mix. The file is readable only by its owner.
 */
export class CredentialStore {
	constructor(private readonly path: string) {}

	async get(apiUrl: string): Promise<Credential | undefined> {
		return (await this.read())[apiUrl]
	}

	async set(apiUrl: string, credential: Credential): Promise<void> {
		const all = await this.read()
		all[apiUrl] = credential
		await this.write(all)
	}

	async delete(apiUrl: string): Promise<void> {
		const all = await this.read()
		delete all[apiUrl]
		await this.write(all)
	}

	private async read(): Promise<CredentialFile> {
		try {
			return JSON.parse(await readFile(this.path, "utf8")) as CredentialFile
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}
			throw error
		}
	}

	private async write(all: CredentialFile): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
		await writeFile(this.path, `${JSON.stringify(all, null, 2)}\n`, { mode: 0o600 })
		// writeFile's mode only applies when it creates the file.
		await chmod(this.path, 0o600)
	}
}
