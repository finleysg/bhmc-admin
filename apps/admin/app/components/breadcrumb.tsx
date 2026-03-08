"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface BreadcrumbItem {
	label: string
	href?: string
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
	const segments = pathname.split("/").filter(Boolean)

	if (segments.length === 0) {
		return [{ label: "Dashboard", href: "/" }]
	}

	const breadcrumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }]

	let currentPath = ""

	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i]
		currentPath += `/${segment}`

		let label: string
		switch (segment) {
			case "club":
				label = "Club Administration"
				break
			case "events":
				label = "Events"
				break
			case "sign-in":
				label = "Sign In"
				break
			default:
				// Handle dynamic segments like [eventId]
				if (segment.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
					label = "Event Details"
				} else if (segment === "golf-genius") {
					label = "Golf Genius Integration"
				} else if (segment === "reports") {
					label = "Reports"
				} else if (segment === "players") {
					label = "Players"
				} else if (segment === "payouts") {
					label = "Payouts"
				} else if (segment === "credit") {
					label = "Post Credit"
				} else if (segment === "cash") {
					label = "Post Cash"
				} else if (segment === "payments") {
					label = "Payment Report"
				} else if (segment === "membership") {
					label = "Membership Report"
				} else if (segment === "documents") {
					label = "Club Documents"
				} else if (segment === "photos") {
					label = "Photos"
				} else if (segment === "settings") {
					label = "Settings"
				} else {
					label = segment.charAt(0).toUpperCase() + segment.slice(1)
				}
				break
		}

		const isLast = i === segments.length - 1
		breadcrumbs.push({
			label,
			href: isLast ? undefined : currentPath,
		})
	}

	return breadcrumbs
}

export default function Breadcrumb() {
	const pathname = usePathname()
	const breadcrumbs = generateBreadcrumbs(pathname)

	return (
		<div className="bg-base-200 container mx-auto pl-4 pr-4">
			<div className="breadcrumbs text-sm">
				<ul>
					{breadcrumbs.map((crumb, index) => (
						<li key={index}>
							{crumb.href ? (
								<Link href={crumb.href} className="text-primary hover:text-primary-focus">
									{crumb.label}
								</Link>
							) : (
								<span className="text-base-content font-semibold">{crumb.label}</span>
							)}
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
