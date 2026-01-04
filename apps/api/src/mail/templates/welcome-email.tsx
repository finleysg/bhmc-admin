import { Heading, Link, Text } from "@react-email/components"

import { EmailLayout, link, paragraph, signature, subheading } from "./components"

interface WelcomeEmailProps {
	firstName: string
	year: string
	accountUrl: string
}

export function WelcomeEmail({ firstName, year, accountUrl }: WelcomeEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Welcome to the Club!
			</Heading>
			<Text style={paragraph}>
				Hello, {firstName}. You are receiving this email because you just registered for the {year}{" "}
				golf season.
			</Text>
			<Text style={paragraph}>
				If you are joining a club for the first time and do not yet have a ghin, we will register
				you with the MGA to get one for you. Part of your dues pays for the handicap service
				provided by the Minnesota Golf Association. You cannot register for our events without a
				ghin, and you must have an active handicap (
				<Link
					href="https://www.usga.org/content/usga/home-page/handicapping/world-handicap-system/world-handicap-system-usga-golf-faqs/faqs---how-many-scores-to-get-a-handicap-index.html"
					style={link}
				>
					minimum 54 holes posted
				</Link>
				) to receive strokes in any event.
			</Text>
			<Text style={paragraph}>
				Please visit your{" "}
				<Link href={accountUrl} style={link}>
					account page
				</Link>{" "}
				to check your contact information and make sure it is complete and accurate. It's also a
				good idea to review our policy pages on the website for information about how things work
				around here.
			</Text>
			<Text style={paragraph}>
				Thank you again for joining our club. If you have any questions, please contact a board
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
