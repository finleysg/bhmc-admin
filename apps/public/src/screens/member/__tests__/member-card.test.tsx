import { render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { FaUser } from "react-icons/fa"
import { expect, test } from "vitest"

import { MemberCard } from "../member-card"

test("renders title, icon, description", () => {
	render(
		<BrowserRouter>
			<MemberCard
				title="Test Card"
				description="Test description"
				icon={FaUser}
				action="/test-route"
			/>
		</BrowserRouter>,
	)

	expect(screen.getByText("Test Card")).toBeInTheDocument()
	expect(screen.getByText("Test description")).toBeInTheDocument()
	expect(screen.getByText("Open")).toBeInTheDocument()
})

test("click navigates to specified route", () => {
	render(
		<BrowserRouter>
			<MemberCard
				title="Test Card"
				description="Test description"
				icon={FaUser}
				action="/member/account"
			/>
		</BrowserRouter>,
	)

	const link = screen.getByText("Open")
	expect(link).toHaveAttribute("href", "/member/account")
})
