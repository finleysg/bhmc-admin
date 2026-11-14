// Runs before each test file, before any app module is imported.
const url =
	process.env.INTEGRATION_DATABASE_URL ?? "mysql://gg:integration@localhost:25060/bhmc_test"

// Tests truncate tables. Never let them near a database not named *_test.
const dbName = new URL(url).pathname.slice(1)
if (!dbName.endsWith("_test")) {
	throw new Error(`Integration tests refuse to run against "${dbName}" (must end in _test)`)
}

process.env.DATABASE_URL = url
process.env.NODE_ENV = "test"
process.env.MAIL_FROM = "test@example.com"
process.env.MAIL_HOST = "localhost"
process.env.MAIL_PORT = "1025"
process.env.WEBSITE_URL = "https://test.example.com"
process.env.STRIPE_SECRET_KEY = "sk_test_fake"
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake"
process.env.GOLF_GENIUS_API_KEY = "fake_api_key"
delete process.env.POSTHOG_KEY
