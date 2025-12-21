import { NextRequest, NextResponse } from "next/server"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/sign-in"]

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Allow public routes
	if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
		return NextResponse.next()
	}

	// Allow static files and Next.js internals
	// Static files typically have extensions - match only files with common static extensions at the end
	const staticFilePattern = /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/i
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/favicon") ||
		staticFilePattern.test(pathname)
	) {
		return NextResponse.next()
	}

	// Check for access_token cookie - actual validation happens in NestJS
	const accessToken = request.cookies.get("access_token")

	if (!accessToken?.value) {
		// No token, redirect to sign-in
		const signInUrl = new URL("/sign-in", request.url)
		signInUrl.searchParams.set("callbackUrl", pathname)
		return NextResponse.redirect(signInUrl)
	}

	// Token exists, allow the request
	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
}
