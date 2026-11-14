import "./global.css"

import type { Metadata } from "next"
import { Montserrat, Open_Sans } from "next/font/google"
import { Toaster } from "sonner"

import { PostHogErrorProvider } from "../components/posthog-provider"
import { AuthProvider } from "../lib/auth-context"
import Breadcrumb from "./components/breadcrumb"
import Header from "./components/header"
import { AdminRoleGuard } from "./components/admin-role-guard"

const montserrat = Montserrat({
	subsets: ["latin"],
	variable: "--font-heading",
	display: "swap",
})

const openSans = Open_Sans({
	subsets: ["latin"],
	variable: "--font-body",
	display: "swap",
})

export const metadata: Metadata = {
	title: "BHMC Event Administration",
	description: "BHMC Administration Portal",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-theme="corporate" suppressHydrationWarning={true}>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
try {
let theme = localStorage.getItem('theme');
if (!theme) {
theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'business' : 'corporate';
}
if (theme !== 'corporate') {
document.documentElement.setAttribute('data-theme', theme);
}
} catch (e) {}
`,
					}}
				/>
			</head>
			<body className={`${montserrat.variable} ${openSans.variable}`}>
				<PostHogErrorProvider>
					<AuthProvider>
						<AdminRoleGuard>
							<div className="min-h-screen bg-base-100 text-base-content">
								<Header />
								<Breadcrumb />
								<main className="container bg-base-200 mx-auto p-4">{children}</main>
							</div>
						</AdminRoleGuard>
					</AuthProvider>
				</PostHogErrorProvider>
				<Toaster />
			</body>
		</html>
	)
}
