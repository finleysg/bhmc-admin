import importPlugin from "eslint-plugin-import"

import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"

export default [
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			import: importPlugin,
		},
		rules: {
			// Your current rules
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "error",

			// TypeScript recommended
			...tseslint.configs.recommended.rules,
			...tseslint.configs["recommended-type-checked"].rules,
		},
		settings: {
			"import/resolver": {
				typescript: true,
			},
		},
	},
	{
		// Override for mapper files - allow any types when mapping database types to domain models
		files: ["**/drizzle.service.ts", "**/__tests__/**.test.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",
		},
	},
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/.next/**",
			"**/.turbo/**",
			"**/.docker/**",
			"**/docker/**",
			"**/coverage/**",
			"**/.vscode/**",
			"**/.pnp/**",
			"**/pnpm-lock.yaml",
			"**/*.log",
			"**/*.config.js",
			"**/*.config.mjs",
			"apps/public/**", // Uses own ESLint 8 config
		],
	},
]
