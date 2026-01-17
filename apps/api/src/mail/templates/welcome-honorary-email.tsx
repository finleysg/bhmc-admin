import React from "react"
import { Heading, Link, Text } from "@react-email/components"

import { EmailLayout, link, paragraph, signature, subheading } from "./components"

interface WelcomeEmailProps {
	firstName: string
	year: string
	accountUrl: string
	signedUpBy: string
}

export function WelcomeHonoraryEmail({
	firstName,
	year,
	accountUrl,
	signedUpBy,
}: WelcomeEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Welcome Back!
			</Heading>
			<Text style={paragraph}>
				Hello, {firstName}. You are receiving this email because as an honorary member or board
				member, you have been registered for the {year} golf season.
			</Text>
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
			<Text style={paragraph}>Thank you for your service to the Bunker Hills Men's Club.</Text>
			<Text style={paragraph}>&nbsp;</Text>
			<Text style={signature}>
				<strong>
					<em>{signedUpBy}</em>
				</strong>
			</Text>
		</EmailLayout>
	)
}
