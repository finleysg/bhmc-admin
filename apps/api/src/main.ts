import * as dotenv from "dotenv"
import * as path from "path"

const envFile = process.env.NODE_ENV === "development" ? ".env.development" : ".env"
dotenv.config({ path: path.resolve(__dirname, "..", envFile) })

import cookieParser from "cookie-parser"
import type { PostHog } from "posthog-node"

import { LogLevel } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"
import { POSTHOG_CLIENT } from "./posthog"

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
		rawBody: true,
	})
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
	const allowedOrigins = (
		process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3100"
	)
		.split(",")
		.map((o) => o.trim())

	app.use(cookieParser())
	// Enable CORS for allowed origins (credentials allowed for cookie/session forwarding)
	app.enableCors({
		origin: (origin, callback) => {
			// Allow requests with no origin (like mobile apps or curl)
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true)
			} else {
				callback(new Error("Not allowed by CORS"))
			}
		},
		credentials: true,
	})

	await app.listen(port)

	const posthog = app.get<PostHog | null>(POSTHOG_CLIENT, { strict: false })
	if (posthog) {
		const properties = { app: "api" }
		process.on("unhandledRejection", (reason) => {
			posthog.captureException(
				reason instanceof Error ? reason : new Error(String(reason)),
				undefined,
				properties,
			)
		})
		process.on("uncaughtException", (error) => {
			posthog.captureException(error, undefined, properties)
			void posthog.flush().then(() => process.exit(1))
		})
	}
	console.log(`API listening on http://localhost:${port}`)
}
void bootstrap()
