import nextPlugin from "@next/eslint-plugin-next"

import baseConfig from "../../packages/eslint-config/index.js"

export default [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@next": nextPlugin,
    },
    rules: {
      // Next.js Core Web Vitals rules
      "@next/no-html-link-for-pages": "error",
      "@next/no-img-element": "warn",
      "@next/no-sync-scripts": "error",
      "@next/no-css-tags": "error",
      "@next/no-head-element": "error",

      // Additional helpful Next.js rules
      "@next/no-document-import-in-page": "error",
      "@next/no-head-import-in-document": "error",
      "@next/google-font-display": "warn",
      "@next/google-font-preconnect": "warn",
      "@next/no-page-custom-font": "warn",
    },
  },
]
