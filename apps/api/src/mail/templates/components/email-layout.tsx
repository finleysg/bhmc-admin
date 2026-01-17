import React from "react"
import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Row,
	Section,
} from "@react-email/components"
import type { ReactNode } from "react"

const LOGO = "https://bhmc.s3.amazonaws.com/media/photos/2026/logo.png"

const colors = {
	heading: "#007DC3",
	link: "#ee6a56",
	text: "#333333",
	background: "#ffffff",
}

interface EmailLayoutProps {
	children: ReactNode
}

export function EmailLayout({ children }: EmailLayoutProps) {
	return (
		<Html>
			<Head />
			<Body style={body}>
				<Container style={container}>
					<Row>
						<Column style={logoColumn}>
							<Link href="https://bhmc.org/home">
								<Img src={LOGO} alt="Bunker Hills Men's Club" style={logo} />
							</Link>
						</Column>
						{/* <Column>
							<Heading style={heading}>Bunker Hills Men's Club</Heading>
						</Column> */}
					</Row>
					<Section style={content}>{children}</Section>
				</Container>
			</Body>
		</Html>
	)
}

const body = {
	margin: 0,
	padding: 0,
	backgroundColor: colors.background,
	fontFamily: "sans-serif",
	fontSize: "14px",
	color: colors.text,
}

const container = {
	maxWidth: "600px",
	margin: "10px auto",
}

const logoColumn = {
	textAlign: "left" as const,
	verticalAlign: "top" as const,
	marginRight: "12px",
}

const logo = {
	height: "6em",
	width: "auto",
}

const heading = {
	color: colors.heading,
	fontSize: "1.5em",
	margin: 0,
	verticalAlign: "top" as const,
}

const content = {
	padding: "10px",
}
