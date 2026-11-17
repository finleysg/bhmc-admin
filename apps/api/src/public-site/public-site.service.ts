import { Injectable, Logger } from "@nestjs/common"

/**
 * Clears tagged data cached by the public site (apps/public-next), through its
 * POST /api/revalidate route. Best effort: a failure is logged, never thrown, since the
 * public site's cache also expires on its own (events after 5 minutes).
 */
@Injectable()
export class PublicSiteService {
	private readonly logger = new Logger(PublicSiteService.name)

	async revalidate(tags: string[]): Promise<void> {
		const baseUrl = process.env.PUBLIC_NEXT_URL
		if (!baseUrl) {
			this.logger.warn(`PUBLIC_NEXT_URL is not set; not revalidating ${tags.join(", ")}`)
			return
		}
		await Promise.all(
			tags.map(async (tag) => {
				try {
					const res = await fetch(`${baseUrl}/api/revalidate`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ tag }),
						signal: AbortSignal.timeout(5000),
					})
					if (!res.ok) this.logger.warn(`Revalidating ${tag} failed: ${res.status}`)
				} catch (error) {
					this.logger.warn(`Revalidating ${tag} failed: ${String(error)}`)
				}
			}),
		)
	}
}
