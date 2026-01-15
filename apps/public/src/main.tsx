import "react-toastify/dist/ReactToastify.css"
import "stop-runaway-react-effects/hijack"
import "./global.css"
import "./global.scss"

import React, { Suspense } from "react"

import { enableMapSet } from "immer"
import { createRoot } from "react-dom/client"

import { App } from "./app"
import { FullPageSpinner } from "./components/spinners/full-screen-spinner"

enableMapSet()

const rootElement = document.getElementById("root")
if (!rootElement) {
	throw new Error("Boom! You need a root element.")
}
const root = createRoot(rootElement)

root.render(
	<React.StrictMode>
		<Suspense fallback={<FullPageSpinner />}>
			<App />
		</Suspense>
	</React.StrictMode>,
)
