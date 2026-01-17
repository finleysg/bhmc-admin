/// <reference types="vitest" />
import path from "path"
import { defineConfig } from "vite"

import react from "@vitejs/plugin-react-swc"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	preview: {
		port: 5000,
	},
	resolve: {
		alias: {
			"~bootstrap": path.resolve(__dirname, "node_modules/bootstrap"),
		},
	},
	css: {
		preprocessorOptions: {
			scss: {
				silenceDeprecations: [
					"color-functions",
					"global-builtin",
					"import",
					"slash-div",
					"legacy-js-api",
					"if-function",
				],
				quietDeps: true,
			},
		},
	},
	server: {
		port: 3000,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./src/test/setup.ts",
		env: {
			VITE_API_URL: "http://localhost:8000/api",
			VITE_AUTH_URL: "http://localhost:8000/rest-auth",
			VITE_SERVER_URL: "http://localhost:8000",
			VITE_CURRENT_ENVIRONMENT: "test",
			VITE_STRIPE_PUBLIC_KEY: "pk_test_mock",
			VITE_GIPHY_API_KEY: "test_giphy_key",
			VITE_SENIOR_AGE: "55",
			VITE_SENIOR_COMPETITION_AGE: "50",
			VITE_VERSION: "test",
			VITE_MODE: "Live",
		},
	},
})
