import React from "react"
import { Heading, Row, Column, Text } from "@react-email/components"

import { EmailLayout, labelCell, paragraph, subheading, tableRow, valueCell } from "./components"

interface PlayerSwapNotificationEmailProps {
	recipientName: string
	swappedWithName: string
	eventName: string
	eventDate: string
	newStartInfo: string
}

export function PlayerSwapNotificationEmail({
	recipientName,
	swappedWithName,
	eventName,
	eventDate,
	newStartInfo,
}: PlayerSwapNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Tee Time Swap Notification
			</Heading>
			<Text style={paragraph}>
				Hi {recipientName}, your tee time has been changed due to a player swap.
			</Text>

			<Text style={paragraph}>
				You have been swapped with {swappedWithName} for the following event:
			</Text>

			{/* Event Details */}
			<Row style={tableRow}>
				<Column style={labelCell}>Event:</Column>
				<Column style={valueCell}>{eventName}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Date:</Column>
				<Column style={valueCell}>{eventDate}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>New Start:</Column>
				<Column style={valueCell}>{newStartInfo}</Column>
			</Row>

			<Text style={paragraph}>
				Please make note of your new tee time. If you have any questions or concerns, please contact
				the event administrator.
			</Text>
		</EmailLayout>
	)
}
