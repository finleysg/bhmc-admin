import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, it, expect } from "vitest"
import { Navigate } from "react-router-dom"
import { LegacyScoresRedirect } from "../../components/legacy-redirect"

describe("Legacy Redirects", () => {
	it("redirects /my-account to /member/account", () => {
		render(
			<MemoryRouter initialEntries={["/my-account"]}>
				<Routes>
					<Route path="/my-account" element={<Navigate to="/member/account" replace />} />
					<Route path="/member/account" element={<div>Member Account</div>} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText("Member Account")).toBeInTheDocument()
	})

	it("redirects /my-activity to /member/friends", () => {
		render(
			<MemoryRouter initialEntries={["/my-activity"]}>
				<Routes>
					<Route path="/my-activity" element={<Navigate to="/member/friends" replace />} />
					<Route path="/member/friends" element={<div>Member Friends</div>} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText("Member Friends")).toBeInTheDocument()
	})

	it("redirects /my-scores/gross/2024 to /member/scores/gross/2024", () => {
		render(
			<MemoryRouter initialEntries={["/my-scores/gross/2024"]}>
				<Routes>
					<Route path="/my-scores/*" element={<LegacyScoresRedirect />} />
					<Route path="/member/scores/gross/2024" element={<div>Gross 2024 Scores</div>} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText("Gross 2024 Scores")).toBeInTheDocument()
	})
})
