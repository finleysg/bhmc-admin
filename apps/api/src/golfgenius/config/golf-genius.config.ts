import { registerAs } from "@nestjs/config"

export default registerAs("golfGenius", () => ({
	apiKey: process.env.GOLF_GENIUS_API_KEY,
	baseUrl: process.env.GOLF_GENIUS_BASE_URL || "https://www.golfgenius.com",
	timeout: parseInt(process.env.GOLF_GENIUS_TIMEOUT || "30000", 10),
	maxRetries: parseInt(process.env.GOLF_GENIUS_MAX_RETRIES || "3", 10),
	retryDelayBase: parseInt(process.env.GOLF_GENIUS_RETRY_DELAY_BASE || "1000", 10),
	categoryId: process.env.GOLF_GENIUS_CATEGORY_ID || "4788194574457686575",
}))
