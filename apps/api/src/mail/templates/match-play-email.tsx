import { Heading, Link, Text } from "@react-email/components"

import { EmailLayout, link, paragraph, signature, subheading } from "./components"

interface MatchPlayEmailProps {
	firstName: string
	year: string
	matchplayUrl: string
}

export function MatchPlayEmail({ firstName, year, matchplayUrl }: MatchPlayEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Season Long Match Play
			</Heading>
			<Text style={paragraph}>
				Hello, {firstName}, you are receiving this email because you just registered for the {year}{" "}
				season long match play tournament.
			</Text>
			<Text style={paragraph}>
				You can return to the{" "}
				<Link href={matchplayUrl} style={link}>
					match play page
				</Link>{" "}
				at any time to review the rules and deadlines. Once matches are underway, you will also see
				a link to the Golf Genius portal page, where we update the brackets.
			</Text>
			<Text style={paragraph}>
				Please schedule your matches as soon as possible once you know your opponent for a given
				round. Even better, keep May 8 open to play your first match on the Match Play Kickoff Day.
				If you have any trouble getting a match scheduled, notify one of the co-chairs right away.
			</Text>
			<Text style={paragraph}>Thank you again for participating in this tournament.</Text>
			<Text style={paragraph}>&nbsp;</Text>
			<Text style={signature}>
				<strong>
					<em>Good luck!</em>
				</strong>
			</Text>
		</EmailLayout>
	)
}
