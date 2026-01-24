import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, Navigate } from "react-router-dom"
import { expect, test, describe } from "vitest"
import { LegacyScoresRedirect } from "../../../components/legacy-redirect"

describe("legacy route redirects", () => {
	test("/my-account redirects to /member/account", () => {
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

	test("/my-activity redirects to /member/friends", () => {
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

	test("/my-scores/gross/2024 redirects to /member/scores/gross/2024", () => {
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

	test("/my-scores/net/all redirects to /member/scores/net/all", () => {
		render(
			<MemoryRouter initialEntries={["/my-scores/net/all"]}>
				<Routes>
					<Route path="/my-scores/*" element={<LegacyScoresRedirect />} />
					<Route path="/member/scores/net/all" element={<div>Net All Scores</div>} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText("Net All Scores")).toBeInTheDocument()
	})
})
