const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_URL || "http://localhost:8000"

export function resolvePhotoUrl(url: string) {
	if (url.startsWith("http")) {
		return url
	}
	return `${DJANGO_URL}${url}`
}
