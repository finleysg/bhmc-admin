import { defineConfig, devices } from "@playwright/test"

const isCI = !!process.env.CI

export default defineConfig({
	testDir: ".",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI ? [["github"], ["html", { outputFolder: "../playwright-report" }]] : "html",
	outputDir: "../test-results",
	globalSetup: "./global-setup",

	use: {
		trace: "on-first-retry",
	},

	projects: [
		{
			name: "public-next-setup",
			testMatch: /auth\.setup\.ts/,
			use: {
				baseURL: "http://localhost:3200",
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "public-next-authed",
			testMatch:
				/public-next\/(?!.*(?:guest|sign-in|sign-up|password-reset|registration|navigation\.authed)).*\.spec\.ts/,
			dependencies: ["public-next-setup"],
			use: {
				baseURL: "http://localhost:3200",
				storageState: "playwright/.auth/user.json",
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "public-next-guest",
			testMatch: /public-next\/(?:.*guest.*|sign-in|sign-up|password-reset)\.spec\.ts/,
			use: {
				baseURL: "http://localhost:3200",
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "public-next-registration",
			testMatch: /public-next\/registration.*\.spec\.ts/,
			dependencies: ["public-next-setup"],
			fullyParallel: false,
			use: {
				baseURL: "http://localhost:3200",
				storageState: "playwright/.auth/user.json",
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "public-next-teardown",
			testMatch: /public-next\/navigation\.authed\.spec\.ts/,
			dependencies: ["public-next-authed", "public-next-registration"],
			use: {
				baseURL: "http://localhost:3200",
				storageState: "playwright/.auth/user.json",
				...devices["Desktop Chrome"],
			},
		},
	],
})
