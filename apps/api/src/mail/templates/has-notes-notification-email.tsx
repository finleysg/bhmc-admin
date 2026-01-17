import React from "react"
import { Heading, Row, Column, Text } from "@react-email/components"

import { EmailLayout, labelCell, paragraph, subheading, tableRow, valueCell } from "./components"

interface HasNotesNotificationEmailProps {
	name: string
	email: string
	event: string
	notes: string
}

export function HasNotesNotificationEmail({
	name,
	email,
	event,
	notes,
}: HasNotesNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Event Notification: Notes Included
			</Heading>
			<Text style={paragraph}>
				You are receiving this email because a member has submitted an event registration with
				notes:
			</Text>

			<Row style={tableRow}>
				<Column style={labelCell}>Name:</Column>
				<Column style={valueCell}>{name}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Email:</Column>
				<Column style={valueCell}>{email}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Event:</Column>
				<Column style={valueCell}>{event}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Notes:</Column>
				<Column style={valueCell}>{notes}</Column>
			</Row>
		</EmailLayout>
	)
}
