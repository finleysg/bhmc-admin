import { Global, Inject, Module, OnApplicationShutdown, Optional } from "@nestjs/common"
import { PostHog } from "posthog-node"

export const POSTHOG_CLIENT = "POSTHOG_CLIENT"

@Global()
@Module({
	providers: [
		{
			provide: POSTHOG_CLIENT,
			useFactory: () => {
				const key = process.env.POSTHOG_KEY
				if (!key) return null
				return new PostHog(key, {
					host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
				})
			},
		},
	],
	exports: [POSTHOG_CLIENT],
})
export class PostHogModule implements OnApplicationShutdown {
	constructor(@Optional() @Inject(POSTHOG_CLIENT) private readonly posthog?: PostHog | null) {}

	async onApplicationShutdown() {
		await this.posthog?.shutdown()
	}
}
