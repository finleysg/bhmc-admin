import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, Navigate } from "react-router-dom"
import { expect, test, describe } from "vitest"

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

	test("/my-scores/gross/2024 redirects to /my-scores", () => {
		render(
			<MemoryRouter initialEntries={["/my-scores/gross/2024"]}>
				<Routes>
					<Route path="/my-scores/*" element={<Navigate to="/my-scores" replace />} />
					<Route path="/my-scores" element={<div>My Scores</div>} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText("My Scores")).toBeInTheDocument()
	})

	test("/member/scores/net/all redirects to /member/scores", () => {
		render(
			<MemoryRouter initialEntries={["/member/scores/net/all"]}>
				<Routes>
					<Route path="/member/scores/*" element={<Navigate to="/member/scores" replace />} />
					<Route path="/member/scores" element={<div>Member Scores</div>} />
				</Routes>
			</MemoryRouter>,
		)

		expect(screen.getByText("Member Scores")).toBeInTheDocument()
	})
})
