import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import type { Config } from "jest"
import nextJest from "next/jest.js"

const require = createRequire(import.meta.url)
const reactDomDir = dirname(require.resolve("react-dom"))

const createJestConfig = nextJest({
	// Provide the path to your Next.js app to load next.config.js and .env files in your test environment
	dir: "./",
})

// Add any custom config to be passed to Jest
const config: Config = {
	coverageProvider: "v8",
	testEnvironment: "jsdom",
	passWithNoTests: true,
	modulePathIgnorePatterns: ["<rootDir>/.next/"],
	// Add more setup options before each test is run
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	// Force a single copy of react/react-dom to avoid dual-instance issues with pnpm
	moduleNameMapper: {
		"^react$": require.resolve("react"),
		"^react-dom$": require.resolve("react-dom"),
		"^react-dom/(.*)$": join(reactDomDir, "$1"),
	},
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
