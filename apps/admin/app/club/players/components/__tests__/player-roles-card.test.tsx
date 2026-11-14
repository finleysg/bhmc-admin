import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { setPlayerRoles } from "../../actions"
import { PlayerRolesCard } from "../player-roles-card"

jest.mock("../../actions", () => ({ setPlayerRoles: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }))

const setPlayerRolesMock = jest.mocked(setPlayerRoles)

describe("PlayerRolesCard", () => {
	beforeEach(() => {
		setPlayerRolesMock.mockReset()
	})

	it("explains that a player without an account cannot get roles", () => {
		render(<PlayerRolesCard playerId={7} current={null} />)

		expect(screen.getByText(/no login account/i)).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /save roles/i })).not.toBeInTheDocument()
	})

	it("checks the player's current roles", () => {
		render(
			<PlayerRolesCard playerId={7} current={{ roles: ["event-admin"], isSuperuser: false }} />,
		)

		expect(screen.getByRole("checkbox", { name: "Event Admin" })).toBeChecked()
		expect(screen.getByRole("checkbox", { name: "Club Admin" })).not.toBeChecked()
		expect(screen.queryByText(/superuser/i)).not.toBeInTheDocument()
	})

	it("notes that a superuser holds every role", () => {
		render(<PlayerRolesCard playerId={7} current={{ roles: [], isSuperuser: true }} />)

		expect(screen.getByText(/superuser/i)).toBeInTheDocument()
	})

	it("submits the checked roles", async () => {
		const user = userEvent.setup()
		setPlayerRolesMock.mockResolvedValue({ status: "success", message: "Admin roles updated" })
		render(
			<PlayerRolesCard playerId={7} current={{ roles: ["event-admin"], isSuperuser: false }} />,
		)

		await user.click(screen.getByRole("checkbox", { name: "Club Admin" }))
		await user.click(screen.getByRole("button", { name: /save roles/i }))

		await waitFor(() => expect(setPlayerRolesMock).toHaveBeenCalled())
		const [playerId, , formData] = setPlayerRolesMock.mock.calls[0]
		expect(playerId).toBe(7)
		expect(formData.getAll("roles")).toEqual(["event-admin", "club-admin"])
	})

	it("shows the action's error message", async () => {
		const user = userEvent.setup()
		setPlayerRolesMock.mockResolvedValue({
			status: "error",
			message: "Player 7 has no login account",
		})
		render(<PlayerRolesCard playerId={7} current={{ roles: [], isSuperuser: false }} />)

		await user.click(screen.getByRole("button", { name: /save roles/i }))

		expect(await screen.findByText("Player 7 has no login account")).toBeInTheDocument()
	})
})
