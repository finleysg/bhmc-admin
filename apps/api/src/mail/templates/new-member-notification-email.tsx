import { Heading, Link, Row, Column, Text } from "@react-email/components"

import {
	EmailLayout,
	labelCell,
	link,
	paragraph,
	subheading,
	tableRow,
	valueCell,
} from "./components"

interface NewMemberNotificationEmailProps {
	year: string
	name: string
	email: string
	ghin: string
	notes: string
	adminUrl: string
}

export function NewMemberNotificationEmail({
	year,
	name,
	email,
	ghin,
	notes,
	adminUrl,
}: NewMemberNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				New Member Notification
			</Heading>
			<Text style={paragraph}>A new member just registered for the {year} golf season.</Text>

			<Row style={tableRow}>
				<Column style={labelCell}>Name:</Column>
				<Column style={valueCell}>{name}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Email:</Column>
				<Column style={valueCell}>{email}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>GHIN:</Column>
				<Column style={valueCell}>{ghin}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Notes:</Column>
				<Column style={valueCell}>{notes}</Column>
			</Row>

			<Text style={paragraph}>
				To view or update this member's player record (ghin or tee):{" "}
				<Link href={adminUrl} style={link}>
					admin site
				</Link>
				.
			</Text>
		</EmailLayout>
	)
}
