import "./global.css"

import type { Metadata } from "next"

import Header from "./components/header"

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
					<Header />
					<main className="container bg-base-200 mx-auto p-4">{children}</main>
				</div>
			</body>
		</html>
	)
}
