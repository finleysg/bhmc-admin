import { apiBaseUrl, authBaseUrl, serverBaseUrl } from "./app-config"

const normalizeEndpoint = (endpoint: string) => {
	if (!endpoint) {
		console.warn("Endpoint is empty")
		return ""
	}
	const [base, querystring] = endpoint.split("?")
	if (!base.startsWith("/") && base.endsWith("/")) {
		return `${base}${querystring ? "?" + querystring : ""}`
	}
	if (!base.startsWith("/") && !base.endsWith("/")) {
		return `${base}/${querystring ? "?" + querystring : ""}`
	}
	if (base.startsWith("/") && base.endsWith("/")) {
		return `${base.substring(1)}${querystring ? "?" + querystring : ""}`
	}
	if (base.startsWith("/") && !base.endsWith("/")) {
		return `${base.substring(1)}/${querystring ? "?" + querystring : ""}`
	}
	throw new Error("Naughty Zoot! Someone messed up their url.")
}

export const apiUrl = (endpoint: string) => {
	if (endpoint.startsWith("http")) {
		return endpoint
	}
	return `${apiBaseUrl}/${normalizeEndpoint(endpoint)}`
}
export const authUrl = (endpoint: string) => {
	return `${authBaseUrl}/${normalizeEndpoint(endpoint)}`
}
export const serverUrl = (endpoint: string) => {
	return `${serverBaseUrl}/${normalizeEndpoint(endpoint)}`
}
