/* eslint-disable @typescript-eslint/no-explicit-any */
import { SafeParseReturnType, ZodType } from "zod"
import { apiUrl } from "./api-utils"

const parseError = (error: any) => {
	if (typeof error === "string") {
		return new Error(error)
	}
	if (error.non_field_errors) {
		return new Error(error.non_field_errors[0])
	}
	if (error.detail) {
		return new Error(error.detail)
	}
	try {
		const message = JSON.stringify(error)
		return new Error(message)
	} catch (err) {
		return new Error("Server error")
	}
}

export async function httpClient(endpoint: string, options?: Partial<RequestInit>) {
	const { body, ...customConfig } = options ?? {}

	const headers = new Headers(customConfig.headers)
	if (body && !(body instanceof FormData)) {
		headers.set("Content-Type", "application/json")
	}

	let method = customConfig.method
	if (!method) {
		method = body ? "POST" : "GET"
	}

	const config = {
		method: method,
		body: body,
		credentials: "include",
		headers: headers,
	} as RequestInit

	return window.fetch(endpoint, config).then(async (response) => {
		if (response.ok) {
			if (response.status !== 204) {
				const data = await response.json()
				return data
			}
			return null
		} else {
			if (response.status === 401) {
				window.dispatchEvent(new CustomEvent("auth-invalid"))
			}
			const error = await response.json()
			return Promise.reject(parseError(error))
		}
	})
}

export async function getOne<TData extends object>(
	endpoint: string,
	schema: ZodType<TData>,
): Promise<TData | undefined> {
	const json = await httpClient(apiUrl(endpoint))
	let result: SafeParseReturnType<TData, TData>
	if (Array.isArray(json) && json.length >= 1) {
		result = schema.safeParse(json[0])
	} else if (typeof json === "object") {
		result = schema.safeParse(json)
	} else {
		throw new Error(`No data returned from ${endpoint}`)
	}
	if (result.success) {
		return result.data
	} else {
		// Unexpected data - should just be a development issue
		console.error(`API data parsing error from ${endpoint}`)
		throw result.error
	}
}

export async function getMany<TData extends object>(
	endpoint: string,
	schema: ZodType<TData>,
): Promise<TData[]> {
	const data: TData[] = []
	const json = await httpClient(apiUrl(endpoint))
	json?.forEach((obj: unknown) => {
		const result = schema.safeParse(obj)
		if (result.success) {
			data.push(result.data)
		} else {
			// Unexpected data - should just be a development issue
			console.error(`API data parsing error from ${endpoint}`)
			throw result.error
		}
	})
	return data
}
