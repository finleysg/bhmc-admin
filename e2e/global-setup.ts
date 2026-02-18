import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function globalSetup() {
	const outputPath = path.resolve(__dirname, "playwright/.test-events.json")

	let result: string
	try {
		result = execSync("docker exec bhmc-admin-backend-1 uv run python manage.py seed_test_events", {
			encoding: "utf-8",
			timeout: 30000,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new Error(
			`Failed to run seed_test_events. Is Docker running and the backend container up?\n` +
				`Run 'pnpm docker:up' first.\n\nOriginal error: ${message}`,
		)
	}

	// Extract JSON from stdout (skip any Django log output)
	const jsonStart = result.indexOf("{")
	if (jsonStart === -1) {
		throw new Error(`seed_test_events did not return valid JSON.\nOutput: ${result.slice(0, 500)}`)
	}

	const jsonStr = result.slice(jsonStart)
	let parsed: unknown
	try {
		parsed = JSON.parse(jsonStr)
	} catch {
		throw new Error(
			`Failed to parse seed_test_events JSON output.\nOutput: ${jsonStr.slice(0, 500)}`,
		)
	}

	fs.mkdirSync(path.dirname(outputPath), { recursive: true })
	fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2))
}

export default globalSetup
