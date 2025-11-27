module.exports = {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	rootDir: "src",
	testMatch: ["**/__tests__/**/*.test.ts"],
	extensionsToTreatAsEsm: [".ts"],
	setupFilesAfterEnv: ["<rootDir>/../jest.setup.ts"],
	transform: {
		"^.+\\.tsx?$": ["ts-jest", { useESM: true }],
	},
}
