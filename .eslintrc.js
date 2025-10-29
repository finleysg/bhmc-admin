module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "./tsconfig.json",
		tsconfigRootDir: __dirname,
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "import"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		"plugin:import/errors",
		"plugin:import/warnings",
		"plugin:import/typescript",
		"prettier",
	],
	rules: {
		"no-console": "warn",
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		"@typescript-eslint/no-explicit-any": "error",
		"import/order": ["error", { alphabetize: { order: "asc" } }],
	},
	settings: {
		"import/resolver": {
			typescript: {},
		},
	},
	ignorePatterns: ["node_modules", "dist", "build", ".next", "docker"],
}
