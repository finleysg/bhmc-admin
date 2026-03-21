"use client"

import { PageLayout } from "../components/ui/page-layout"
import { PageHeader } from "../components/ui/page-header"
import { Alert } from "../components/ui/alert"

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200"

export default function RestrictedPage() {
	return (
		<PageLayout maxWidth="3xl">
			<PageHeader centered={true} className="text-primary mb-2">
				Restricted Access
			</PageHeader>
			<Alert type="warning">
				This site is restricted to authorized administrators. If you believe you should have access,
				please contact a club administrator.
			</Alert>
			<div className="mt-6 text-center">
				<a href={PUBLIC_SITE_URL} className="btn btn-primary btn-sm">
					Return to Site
				</a>
			</div>
		</PageLayout>
	)
}
