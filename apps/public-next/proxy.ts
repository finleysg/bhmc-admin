import { NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname

	// Maintenance mode: redirect all non-maintenance requests
	const mode = process.env.NEXT_PUBLIC_MODE
	if (mode && mode !== "Live" && !pathname.startsWith("/maintenance")) {
		return NextResponse.redirect(new URL("/maintenance", request.url))
	}

	// Redirect /home to root
	if (pathname === "/home") {
		return NextResponse.redirect(new URL("/", request.url))
	}

	// Auth guard: require access_token for member and registration pages
	if (pathname.startsWith("/member") || pathname.startsWith("/registration")) {
		const token = request.cookies.get("access_token")
		if (!token) {
			const redirectUrl = encodeURIComponent(pathname)
			return NextResponse.redirect(new URL(`/sign-in?redirectUrl=${redirectUrl}`, request.url))
		}
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
		 */
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
}
