import * as Joi from "joi"

export const validationSchema = Joi.object({
	GOLF_GENIUS_API_KEY: Joi.string().required(),
	GOLF_GENIUS_BASE_URL: Joi.string().uri().default("https://www.golfgenius.com"),
	GOLF_GENIUS_TIMEOUT: Joi.number().default(30000),
	GOLF_GENIUS_MAX_RETRIES: Joi.number().default(3),
	GOLF_GENIUS_RETRY_DELAY_BASE: Joi.number().default(1000),
})
