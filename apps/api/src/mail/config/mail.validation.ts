import * as Joi from "joi"

export const mailValidationSchema = Joi.object({
	MAIL_FROM: Joi.string().required(),
	WEBSITE_URL: Joi.string().uri().required(),
	NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
	// Dev-only (SMTP for mailpit)
	MAIL_HOST: Joi.when("NODE_ENV", { is: "development", then: Joi.string().required() }),
	MAIL_PORT: Joi.when("NODE_ENV", { is: "development", then: Joi.number().required() }),
	// Prod-only (Mailgun)
	MAILGUN_API_KEY: Joi.when("NODE_ENV", { not: "development", then: Joi.string().required() }),
	MAILGUN_SENDER_DOMAIN: Joi.when("NODE_ENV", {
		not: "development",
		then: Joi.string().required(),
	}),
})
