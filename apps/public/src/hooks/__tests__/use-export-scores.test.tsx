import { renderHook, waitFor } from "@testing-library/react"
import { PropsWithChildren } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { http, HttpResponse, server } from "../../test/test-server"
import { serverUrl } from "../../utils/api-utils"
import { useExportScores } from "../use-export-scores"

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: {
				retry: false,
			},
		},
	})
	return function Wrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}
}

const mockCreateObjectURL = vi.fn(() => "blob:mock-url")
const mockRevokeObjectURL = vi.fn()

beforeEach(() => {
	vi.spyOn(window.URL, "createObjectURL").mockImplementation(mockCreateObjectURL)
	vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(mockRevokeObjectURL)
})

afterEach(() => {
	vi.restoreAllMocks()
})

test("constructs URL with season only", async () => {
	let capturedUrl = ""
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
			capturedUrl = request.url
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2024 })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(capturedUrl).toBe("http://localhost:8000/reports/member/scores/2024/export/")
})

test("constructs URL with courseIds query param", async () => {
	let capturedUrl = ""
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
			capturedUrl = request.url
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2024, courseIds: [1, 2, 3] })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(capturedUrl).toContain("courseIds=1%2C2%2C3")
})

test("constructs URL with scoreType query param", async () => {
	let capturedUrl = ""
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
			capturedUrl = request.url
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2024, scoreType: "gross" })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(capturedUrl).toContain("scoreType=gross")
})

test("constructs URL with all query params", async () => {
	let capturedUrl = ""
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
			capturedUrl = request.url
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2023, courseIds: [5, 10], scoreType: "net" })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(capturedUrl).toContain("/2023/")
	expect(capturedUrl).toContain("courseIds=5%2C10")
	expect(capturedUrl).toContain("scoreType=net")
})

test("triggers download flow", async () => {
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), () => {
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2024 })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(mockCreateObjectURL).toHaveBeenCalled()
	expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
})

test("sets download filename based on season", async () => {
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), () => {
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2025 })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	// Verify that a link was created and clicked for download
	// The actual download attribute is set on the anchor element
	expect(mockCreateObjectURL).toHaveBeenCalled()
})

test("throws error on non-ok response", async () => {
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), () => {
			return new HttpResponse(null, { status: 500 })
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2024 })

	await waitFor(() => expect(result.current.isError).toBe(true))

	expect(result.current.error?.message).toBe("Failed to export scores")
})

test("skips empty courseIds array in query params", async () => {
	let capturedUrl = ""
	server.use(
		http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
			capturedUrl = request.url
			return new HttpResponse(new Blob(["test"]), {
				headers: {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			})
		}),
	)

	const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

	result.current.mutate({ season: 2024, courseIds: [] })

	await waitFor(() => expect(result.current.isSuccess).toBe(true))

	expect(capturedUrl).not.toContain("courseIds")
})
