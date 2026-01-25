import { renderHook, waitFor } from "@testing-library/react"
import { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

describe("useExportScores", () => {
	const mockCreateObjectURL = vi.fn(() => "blob:mock-url")
	const mockRevokeObjectURL = vi.fn()
	const mockClick = vi.fn()
	const mockAppendChild = vi.fn()
	const mockRemoveChild = vi.fn()

	beforeEach(() => {
		vi.stubGlobal("URL", {
			createObjectURL: mockCreateObjectURL,
			revokeObjectURL: mockRevokeObjectURL,
		})

		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "a") {
				return {
					href: "",
					download: "",
					click: mockClick,
				} as unknown as HTMLAnchorElement
			}
			return document.createElement(tag)
		})

		vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild)
		vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild)
	})

	it("constructs URL with season only", async () => {
		let capturedUrl = ""
		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
				capturedUrl = request.url
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
				})
			}),
		)

		const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

		result.current.mutate({ season: 2024 })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).toBe("http://localhost:8000/reports/member/scores/2024/export/")
	})

	it("constructs URL with courseIds query param", async () => {
		let capturedUrl = ""
		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
				capturedUrl = request.url
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
				})
			}),
		)

		const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

		result.current.mutate({ season: 2024, courseIds: [1, 2, 3] })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).toContain("courseIds=1%2C2%2C3")
	})

	it("constructs URL with scoreType query param", async () => {
		let capturedUrl = ""
		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
				capturedUrl = request.url
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
				})
			}),
		)

		const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

		result.current.mutate({ season: 2024, scoreType: "gross" })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).toContain("scoreType=gross")
	})

	it("constructs URL with all query params", async () => {
		let capturedUrl = ""
		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
				capturedUrl = request.url
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
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

	it("triggers download with correct filename", async () => {
		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), () => {
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
				})
			}),
		)

		const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

		result.current.mutate({ season: 2024 })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(mockCreateObjectURL).toHaveBeenCalled()
		expect(mockClick).toHaveBeenCalled()
		expect(mockAppendChild).toHaveBeenCalled()
		expect(mockRemoveChild).toHaveBeenCalled()
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
	})

	it("sets download filename based on season", async () => {
		let capturedLink: { download?: string } = {}
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			if (tag === "a") {
				capturedLink = {
					href: "",
					download: "",
					click: mockClick,
				}
				return capturedLink as unknown as HTMLAnchorElement
			}
			return document.createElement(tag)
		})

		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), () => {
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
				})
			}),
		)

		const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

		result.current.mutate({ season: 2025 })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedLink.download).toBe("my-scores-2025.xlsx")
	})

	it("throws error on non-ok response", async () => {
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

	it("skips empty courseIds array in query params", async () => {
		let capturedUrl = ""
		server.use(
			http.get(serverUrl("reports/member/scores/:season/export"), ({ request }) => {
				capturedUrl = request.url
				return new HttpResponse(new Blob(["test"]), {
					headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
				})
			}),
		)

		const { result } = renderHook(() => useExportScores(), { wrapper: createWrapper() })

		result.current.mutate({ season: 2024, courseIds: [] })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).not.toContain("courseIds")
	})
})
