// Set test env vars before any module imports
process.env.NODE_ENV = "test"
process.env.MAIL_FROM = "test@example.com"
process.env.WEBSITE_URL = "https://test.example.com"
process.env.STRIPE_SECRET_KEY = "sk_test_fake"
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake"
process.env.GOLF_GENIUS_API_KEY = "fake_api_key"

import "reflect-metadata"

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
// Silence NestJS Logger during tests
jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common")
	return {
		...actual,
		Logger: jest.fn().mockImplementation(() => ({
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
		})),
	}
})
/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
