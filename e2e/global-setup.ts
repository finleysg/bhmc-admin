import { execSync } from "child_process"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function globalSetup() {
	const outputPath = path.resolve(__dirname, "playwright/.test-events.json")
	const result = execSync(
		"docker exec bhmc-admin-backend-1 uv run python manage.py seed_test_events",
		{ encoding: "utf-8", timeout: 30000 },
	)
	// Extract JSON from stdout (skip any Django log output)
	const jsonStart = result.indexOf("{")
	const jsonStr = result.slice(jsonStart)
	fs.mkdirSync(path.dirname(outputPath), { recursive: true })
	fs.writeFileSync(outputPath, JSON.stringify(JSON.parse(jsonStr), null, 2))
}

export default globalSetup
