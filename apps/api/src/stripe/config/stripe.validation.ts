import * as Joi from "joi"

export const stripeValidationSchema = Joi.object({
	STRIPE_SECRET_KEY: Joi.string().required(),
	STRIPE_WEBHOOK_SECRET: Joi.string().required(),
	STRIPE_API_VERSION: Joi.string().default("2025-12-15.clover"),
})
