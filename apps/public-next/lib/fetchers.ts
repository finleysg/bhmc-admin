const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://backend:8000/api"

interface FetchDjangoOptions {
	revalidate?: number | false
	tags?: string[]
}

export async function fetchDjango<T>(path: string, options?: FetchDjangoOptions): Promise<T> {
	const url = `${DJANGO_API_URL}${path}`
	const response = await fetch(url, {
		next: { revalidate: options?.revalidate ?? 3600, tags: options?.tags },
	})

	if (!response.ok) {
		throw new Error(`Django API error: ${response.status} ${response.statusText} for ${path}`)
	}

	return response.json() as Promise<T>
}

export async function fetchDjangoAuthenticated<T>(path: string): Promise<T> {
	const { cookies } = await import("next/headers")
	const cookieStore = await cookies()
	const token = cookieStore.get("access_token")?.value
	if (!token) {
		throw new Error("Not authenticated")
	}

	const url = `${DJANGO_API_URL}${path}`
	const response = await fetch(url, {
		headers: { Authorization: `Token ${token}` },
		cache: "no-store",
	})

	if (!response.ok) {
		throw new Error(`Django API error: ${response.status} ${response.statusText} for ${path}`)
	}

	return response.json() as Promise<T>
}
