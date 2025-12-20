import * as dotenv from "dotenv"
import * as path from "path"

const envFile = process.env.NODE_ENV === "docker" ? ".env.docker" : ".env"
dotenv.config({ path: path.resolve(__dirname, "..", envFile) })

import { LogLevel } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"

async function bootstrap() {
	const logLevelsOrder: LogLevel[] = ["verbose", "debug", "log", "warn", "error"]
	const logLevel = process.env.LOG_LEVEL || "log"
	let enabledLevels: LogLevel[]
	if (logLevel === "off") {
		enabledLevels = []
	} else {
		const index = logLevelsOrder.indexOf(logLevel as LogLevel)
		if (index === -1) {
			enabledLevels = ["log", "warn", "error"] // default
		} else {
			enabledLevels = logLevelsOrder.slice(index)
		}
	}
	const app = await NestFactory.create(AppModule, {
		logger: enabledLevels.length > 0 ? enabledLevels : false,
	})
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
	const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000"

	// Enable CORS for the web app origin (credentials allowed for cookie/session forwarding)
	app.enableCors({ origin: webOrigin, credentials: true })

	await app.listen(port)
	console.log(`API listening on http://localhost:${port}`)
}
void bootstrap()
