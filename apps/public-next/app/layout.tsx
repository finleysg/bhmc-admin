import "./global.css"

import type { Metadata } from "next"
import { Montserrat, Open_Sans } from "next/font/google"

import { Providers } from "./providers"
import { Header } from "./components/header"
import { Sidebar } from "./components/sidebar"
import { Footer } from "./components/footer"

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
	title: "Bunker Hills Men's Golf Club",
	description:
		"Bunker Hills Men's Golf Club — weekly and monthly golf competitions at Bunker Hills Golf Course in Coon Rapids, MN.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
try {
  let theme = localStorage.getItem('theme');
  if (!theme) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`,
					}}
				/>
			</head>
			<body className={`${montserrat.variable} ${openSans.variable}`}>
				<Providers>
					<div className="flex min-h-screen flex-col">
						<Header />
						<div className="flex flex-1">
							<Sidebar />
							<main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
						</div>
						<Footer />
					</div>
				</Providers>
			</body>
		</html>
	)
}
