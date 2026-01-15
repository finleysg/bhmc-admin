import { getYear } from "date-fns"

export const apiBaseUrl = import.meta.env.VITE_API_URL
export const authBaseUrl = import.meta.env.VITE_AUTH_URL
export const serverBaseUrl = import.meta.env.VITE_SERVER_URL
export const currentEnvironment = import.meta.env.VITE_CURRENT_ENVIRONMENT
export const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY // TODO: retrieve from server
export const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY // TODO: retrieve from server
export const seniorRateAge = +import.meta.env.VITE_SENIOR_AGE
export const seniorCompetitionAge = +import.meta.env.VITE_SENIOR_COMPETITION_AGE
export const version = import.meta.env.VITE_VERSION

export const maintenanceMode = import.meta.env.VITE_MODE !== "Live"
export const currentSeason = getYear(Date.now())
export const twoMinutes = 1000 * 60 * 2
export const fiveMinutes = 1000 * 60 * 5
export const tenMinutes = 1000 * 60 * 10

export const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
})
