"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"

import {
	Breadcrumb as BreadcrumbRoot,
	BreadcrumbItem as BreadcrumbEntry,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/shadcn/breadcrumb"

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
				} else if (segment === "copy") {
					label = "Copy Event"
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
		<BreadcrumbRoot className="container mx-auto px-4 pt-4">
			<BreadcrumbList>
				{breadcrumbs.map((crumb, index) => (
					<Fragment key={index}>
						{index > 0 && <BreadcrumbSeparator />}
						<BreadcrumbEntry>
							{crumb.href ? (
								<BreadcrumbLink asChild>
									<Link href={crumb.href} className="text-primary hover:underline">
										{crumb.label}
									</Link>
								</BreadcrumbLink>
							) : (
								<BreadcrumbPage className="font-semibold">{crumb.label}</BreadcrumbPage>
							)}
						</BreadcrumbEntry>
					</Fragment>
				))}
			</BreadcrumbList>
		</BreadcrumbRoot>
	)
}
