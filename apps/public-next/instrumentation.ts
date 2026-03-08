import { PostHog } from "posthog-node"

export function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const key = process.env.POSTHOG_KEY
		if (!key) return

		const posthog = new PostHog(key, {
			host: process.env.POSTHOG_HOST,
			flushAt: 1,
			flushInterval: 0,
		})

		const properties = { app: "public-next-server" }

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

		process.on("beforeExit", () => {
			void posthog.shutdown()
		})
	}
}
