import { PropsWithChildren, ReactElement } from "react"

import { BrowserRouter, createMemoryRouter, RouterProvider } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import { expect } from "vitest"

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
	MatcherFunction,
	render,
	RenderOptions,
	screen,
	waitFor,
	waitForElementToBeRemoved,
	waitForOptions,
} from "@testing-library/react"

import { DefaultAuthenticationProvider } from "../context/authentication"
import AuthLayout from "../layout/auth-layout"
import MainLayout from "../layout/main-layout"
import { UserData } from "../models/auth"
import { PlayerApiData } from "../models/player"
import { ErrorScreen } from "../screens/error"
import { apiUrl, authUrl } from "../utils/api-utils"
import { playerBuilder } from "./data/account"
import { buildUser } from "./data/auth"
import { http, HttpResponse, server } from "./test-server"
import { AuthProvider } from "../context/auth-context-provider"

const routeConfig = [
	{
		path: "*",
		element: <MainLayout />,
		errorElement: <ErrorScreen />,
	},
	{
		path: "session/*",
		element: <AuthLayout />,
		errorElement: <ErrorScreen />,
	},
]
const testQueryClient = new QueryClient({ queryCache: new QueryCache() })

const waitForLoadingToFinish = () =>
	waitForElementToBeRemoved(
		() => [...screen.queryAllByLabelText(/loading/i), ...screen.queryAllByText(/loading/i)],
		{
			timeout: 2000,
		},
	)

const verifyNeverOccurs = async (negativeAssertionFn: () => unknown, options?: waitForOptions) => {
	await expect(waitFor(negativeAssertionFn, options)).rejects.toThrow()
}

const withHtml =
	(textContent: string): MatcherFunction =>
	(content: string, element: Element | null): boolean =>
		textContent.includes(content) &&
		element?.textContent?.trim() === textContent &&
		Array.from(element.children).every((child) => child.textContent?.trim() !== textContent)

function renderWithAuth(ui: ReactElement, { ...options }: RenderOptions = {}) {
	const Wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={new QueryClient({ queryCache: new QueryCache() })}>
			<AuthProvider authenticationProvider={new DefaultAuthenticationProvider()}>
				<div>
					<ToastContainer />
					<BrowserRouter>{children}</BrowserRouter>
				</div>
			</AuthProvider>
		</QueryClientProvider>
	)
	return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Renders the component at the route given. Useful for testing
 * with params on the route or for testing that navigation is triggered
 * based on user actions. Does not include the admin routes.
 * @param initialPath The route to render.
 * @returns RTL render function (wrapped).
 */
function renderRoute(initialPath: string) {
	const router = createMemoryRouter(routeConfig, {
		initialEntries: [initialPath],
	})

	render(
		<QueryClientProvider client={testQueryClient}>
			<AuthProvider authenticationProvider={new DefaultAuthenticationProvider()}>
				<RouterProvider router={router} />
			</AuthProvider>
		</QueryClientProvider>,
	)
	return router
}

function setupUserAndPlayer(userData: UserData, playerData: PlayerApiData) {
	server.use(
		http.get(authUrl("users/me"), () => {
			return HttpResponse.json(userData)
		}),
		http.get(apiUrl("players"), () => {
			return HttpResponse.json([playerData])
		}),
	)
}

function setupAnonymousUser() {
	server.use(
		http.get(authUrl("users/me/"), () => {
			return HttpResponse.json("No soup for you!", { status: 401 })
		}),
	)
}

/**
 * Supplies an authenticated user to the initial user and player loading http calls.
 * @param isMember Should the user be a member? Defaults to true.
 * @returns
 */
function setupAuthenticatedUser(isMember: boolean = true, ghin: string | null = "123456") {
	const userData = buildUser.one()
	const playerData = playerBuilder.one({
		overrides: {
			first_name: userData.first_name,
			last_name: userData.last_name,
			email: userData.email,
			is_member: isMember,
			ghin: ghin,
		},
	})

	setupUserAndPlayer(userData, playerData)

	return userData
}

/**
 * Supplies a returning member to the initial user and player loading http calls.
 */
function setupReturningMember(currentYear: number) {
	const userData = buildUser.one()
	const playerData = playerBuilder.one({
		overrides: {
			first_name: userData.first_name,
			last_name: userData.last_name,
			email: userData.email,
			is_member: false,
			last_season: currentYear - 1,
			ghin: "654321",
		},
	})

	setupUserAndPlayer(userData, playerData)

	return userData
}

/**
 * Supplies an admin user to the initial user and player loading http calls.
 * @returns
 */
function setupAdminUser() {
	const userData = buildUser.one({
		overrides: {
			is_staff: true,
		},
	})
	const playerData = playerBuilder.one({
		overrides: {
			first_name: userData.first_name,
			last_name: userData.last_name,
			email: userData.email,
			is_member: true,
		},
	})

	setupUserAndPlayer(userData, playerData)

	return userData
}

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react"
export {
	renderRoute,
	renderWithAuth,
	setupAdminUser,
	setupAnonymousUser,
	setupAuthenticatedUser,
	setupReturningMember,
	verifyNeverOccurs,
	waitForLoadingToFinish,
	withHtml,
}
