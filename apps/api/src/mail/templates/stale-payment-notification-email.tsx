import React from "react"
import { Heading, Row, Column, Text } from "@react-email/components"

import { EmailLayout, labelCell, paragraph, subheading, tableRow, valueCell } from "./components"

interface StalePaymentNotificationEmailProps {
	eventName: string
	eventDate: string
	registrationDate: string
}

export function StalePaymentNotificationEmail({
	eventName,
	eventDate,
	registrationDate,
}: StalePaymentNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Failed Payment Alert
			</Heading>
			<Text style={paragraph}>
				The registration payment failed. You are NOT signed up for the event below:
			</Text>

			<Row style={tableRow}>
				<Column style={labelCell}>Event:</Column>
				<Column style={valueCell}>{eventName}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Event Date:</Column>
				<Column style={valueCell}>{eventDate}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Registered:</Column>
				<Column style={valueCell}>{registrationDate}</Column>
			</Row>

			<Text style={paragraph}>
				Please reach out to the tournament coordinator or treasurer if you still want to get into
				this event.
			</Text>
		</EmailLayout>
	)
}
