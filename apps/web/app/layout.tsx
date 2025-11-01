import "./global.css"

import type { Metadata } from "next"

import ThemeToggle from "./components/theme-toggle"

export const metadata: Metadata = {
	title: "BHMC Event Administration",
	description: "BHMC Administration Portal",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-theme="emerald">
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
try {
const theme = localStorage.getItem('theme') || 'emerald';
if (theme !== 'emerald') {
document.documentElement.setAttribute('data-theme', theme);
}
} catch (e) {}
`,
					}}
				/>
			</head>
			<body>
				<div className="min-h-screen bg-base-100 text-base-content">
					<header className="navbar bg-base-200 container mx-auto pl-4 pr-4">
						<div className="flex-1">
							<h1 className="text-xl font-bold">BHMC Event Admin</h1>
						</div>
						<div className="flex-none">
							<ThemeToggle />
						</div>
					</header>
					<main className="container bg-base-200 mx-auto p-4">{children}</main>
				</div>
			</body>
		</html>
	)
}
