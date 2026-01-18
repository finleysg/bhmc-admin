export default {
	// apps/api - uses shared ESLint config via explicit path
	"apps/api/**/*.{ts,tsx,js,jsx}": (filenames) => [
		`eslint --config packages/eslint-config/index.js --fix ${filenames.join(" ")}`,
		`prettier --write ${filenames.join(" ")}`,
	],

	// apps/web - uses local eslint.config.js extending shared config
	"apps/web/**/*.{ts,tsx,js,jsx}": (filenames) => [
		`pnpm --filter @repo/web exec eslint --fix ${filenames.join(" ")}`,
		`prettier --write ${filenames.join(" ")}`,
	],

	// apps/public - ESLint 8 with .eslintrc.cjs, custom prettier config
	"apps/public/src/**/*.{ts,tsx,js,jsx}": (filenames) => [
		`pnpm --filter @repo/public exec eslint --fix ${filenames.join(" ")}`,
		`prettier --config apps/public/.prettierrc.cjs --write ${filenames.join(" ")}`,
	],

	// apps/public CSS/SCSS - custom prettier config
	"apps/public/**/*.{css,scss}": ["prettier --config apps/public/.prettierrc.cjs --write"],

	// packages/domain - uses shared ESLint config
	"packages/domain/**/*.{ts,tsx,js,jsx}": (filenames) => [
		`eslint --config packages/eslint-config/index.js --fix ${filenames.join(" ")}`,
		`prettier --write ${filenames.join(" ")}`,
	],

	// backend Python files - ruff lint + format
	"backend/**/*.py": ["ruff check --fix", "ruff format"],

	// Other files - just prettier
	"*.{json,md,yml,yaml,css,scss}": ["prettier --write"],
}
