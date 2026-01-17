module.exports = {
	root: true,
	env: { browser: true, es2020: true },
	extends: [
		// By extending from a plugin config, we can get recommended rules without having to add them manually.
		"eslint:recommended",
		"plugin:react/recommended",
		"plugin:react-hooks/recommended",
		"plugin:jsx-a11y/recommended",
		"plugin:@typescript-eslint/recommended",
		// "plugin:@tanstack/eslint-plugin-query/recommended",
		// This disables the formatting rules in ESLint that Prettier is going to be responsible for handling.
		// Make sure it's always the last config, so it gets the chance to override other configs.
		"eslint-config-prettier",
	],
	ignorePatterns: ["dist", ".eslintrc.cjs"],
	parser: "@typescript-eslint/parser",
	settings: {
		react: {
			// Tells eslint-plugin-react to automatically detect the version of React to use.
			version: "detect",
		},
		// Tells eslint how to resolve imports
		"import/resolver": {
			node: {
				paths: ["src"],
				extensions: [".js", ".jsx", ".ts", ".tsx"],
			},
		},
	},
	plugins: ["react-refresh"],
	rules: {
		"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
		"react/jsx-uses-react": "off",
		"react/react-in-jsx-scope": "off",
	},
}
