// Local-only API integration tests against a real MySQL database (bhmc_test).
// Run test/integration/setup-db.sh first. Not part of `pnpm test` or CI.
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/test/integration"],
	testMatch: ["**/*.int.test.ts"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
	setupFiles: ["<rootDir>/test/integration/support/env.ts"],
	maxWorkers: 1,
	testTimeout: 30000,
}
