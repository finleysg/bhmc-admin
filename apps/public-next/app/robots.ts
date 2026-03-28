import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: [
					"GPTBot",
					"ChatGPT-User",
					"Google-Extended",
					"CCBot",
					"anthropic-ai",
					"ClaudeBot",
					"Claude-Web",
					"Bytespider",
					"Diffbot",
					"FacebookBot",
					"Applebot-Extended",
					"PerplexityBot",
					"Amazonbot",
					"Cohere-AI",
					"meta-externalagent",
				],
				disallow: "/",
			},
			{
				userAgent: "*",
				disallow: [
					"/member/",
					"/registration/",
					"/membership",
					"/sign-in",
					"/sign-up",
					"/activate/",
					"/reset-password",
					"/event/*/register",
					"/event/*/manage/",
					"/event/*/payment",
				],
			},
		],
	}
}
