import { Button, Heading, Link, Section, Text } from "@react-email/components"

import { EmailLayout, link, paragraph, signature, subheading } from "./components"

interface WelcomeEmailProps {
	firstName: string
	year: string
	accountUrl: string
	paymentUrl?: string
}

const buttonStyle = {
	backgroundColor: "#4f46e5",
	borderRadius: "4px",
	color: "#fff",
	fontWeight: "600" as const,
	padding: "12px 24px",
	textDecoration: "none",
}

export function WelcomeBackEmail({ firstName, year, accountUrl, paymentUrl }: WelcomeEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Welcome Back!
			</Heading>
			<Text style={paragraph}>
				Hello, {firstName}. You are receiving this email because you just registered for the {year}{" "}
				golf season.
			</Text>
			{paymentUrl && (
				<Section style={{ textAlign: "center", margin: "24px 0" }}>
					<Text style={paragraph}>
						Please complete your dues payment to finalize your registration:
					</Text>
					<Button href={paymentUrl} style={buttonStyle}>
						Pay Dues
					</Button>
				</Section>
			)}
			<Text style={paragraph}>
				Please visit your{" "}
				<Link href={accountUrl} style={link}>
					account page
				</Link>{" "}
				to check your contact information and make sure it is complete and accurate.
			</Text>
			<Text style={paragraph}>
				We have our annual Spring Meeting planned for the last Wednesday in March. Please join us
				for information about the new season and any changes coming in {year}.
			</Text>
			<Text style={paragraph}>
				Thank you for joining us again this year. If you have any questions, please contact a board
				member or send the club secretary a note at{" "}
				<Link href="mailto:secretary@bhmc.org" style={link}>
					secretary@bhmc.org
				</Link>
				. We hope you have a great season.
			</Text>
			<Text style={paragraph}>&nbsp;</Text>
			<Text style={signature}>
				<strong>
					<em>The BHMC Board</em>
				</strong>
			</Text>
		</EmailLayout>
	)
}
