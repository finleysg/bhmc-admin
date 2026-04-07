export default {
	extends: ["@commitlint/config-conventional"],
	ignores: [(commit) => /^Merge /.test(commit)],
	rules: {
		"type-enum": [
			2,
			"always",
			["feat", "fix", "docs", "style", "refactor", "perf", "test", "ci", "chore", "revert"],
		],
		"scope-enum": [
			1,
			"always",
			["api", "admin", "public", "public-next", "domain", "eslint-config", "e2e", "deps"],
		],
		"scope-empty": [0],
		"body-max-line-length": [0],
		"footer-max-line-length": [0],
	},
}
