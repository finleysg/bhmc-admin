import "@testing-library/jest-dom/vitest"
import "vitest"

import { afterAll, afterEach, beforeAll, vi } from "vitest"

import { cleanup } from "@testing-library/react"

import { server } from "./test-server"

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" })
})
afterAll(() => server.close())

afterEach(() => {
	server.resetHandlers()
	vi.clearAllMocks()
})
afterEach(() => cleanup())
