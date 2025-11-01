import "./global.css"

import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "BHMC Admin",
	description: "BHMC Administration Portal",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				{children}
			</body>
		</html>
	)
}
