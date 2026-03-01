import { defineConfig, devices } from "@playwright/test"

const isCI = !!process.env.CI

export default defineConfig({
	globalSetup: "./global-setup.ts",
	testDir: ".",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI ? [["github"], ["html", { outputFolder: "../playwright-report" }]] : "html",
	outputDir: "../test-results",

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
				/public-next\/(?!.*(?:guest|sign-in|sign-up|password-reset|reserve|registration-guard|registration-payment)).*\.spec\.ts/,
			dependencies: ["public-next-setup"],
			use: {
				baseURL: "http://localhost:3200",
				storageState: "playwright/.auth/user.json",
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "public-next-self-auth",
			testMatch: /public-next\/(?:reserve|registration-guard|registration-payment)\.spec\.ts/,
			use: {
				baseURL: "http://localhost:3200",
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
	],
})
