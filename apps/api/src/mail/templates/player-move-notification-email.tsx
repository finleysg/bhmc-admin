import React from "react"
import { Heading, Row, Column, Text } from "@react-email/components"

import { EmailLayout, labelCell, paragraph, subheading, tableRow, valueCell } from "./components"

interface PlayerMoveNotificationEmailProps {
	eventName: string
	eventDate: string
	previousStart: string
	newStart: string
}

export function PlayerMoveNotificationEmail({
	eventName,
	eventDate,
	previousStart,
	newStart,
}: PlayerMoveNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Tee Time Change Notification
			</Heading>
			<Text style={paragraph}>Your group has been moved for the following event:</Text>

			<Row style={tableRow}>
				<Column style={labelCell}>Event:</Column>
				<Column style={valueCell}>{eventName}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Date:</Column>
				<Column style={valueCell}>{eventDate}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Previous Start:</Column>
				<Column style={valueCell}>{previousStart}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>New Start:</Column>
				<Column style={valueCell}>{newStart}</Column>
			</Row>

			<Text style={paragraph}>
				Please make note of your new tee time. If you have any questions or concerns, please contact
				the tournament coordinator.
			</Text>
		</EmailLayout>
	)
}
