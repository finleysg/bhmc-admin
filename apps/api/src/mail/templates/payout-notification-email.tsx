import React from "react"
import { Heading, Row, Column, Text } from "@react-email/components"

import {
	EmailLayout,
	labelCell,
	paragraph,
	paymentCell,
	subheading,
	tableRow,
	valueCell,
} from "./components"

interface PayoutNotificationEmailProps {
	recipientName: string
	eventName: string
	eventDate: string
	payoutType: string
	totalAmount: string
}

export function PayoutNotificationEmail({
	recipientName,
	eventName,
	eventDate,
	payoutType,
	totalAmount,
}: PayoutNotificationEmailProps) {
	const message =
		payoutType === "Credit"
			? `Your pro shop credit of ${totalAmount} has been posted to your account.`
			: `Your skins winnings of ${totalAmount} are ready for pickup at the pro shop.`

	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				BHMC Payout Notification
			</Heading>
			<Text style={paragraph}>Hello, {recipientName}.</Text>
			<Text style={paragraph}>{message}</Text>

			<Row style={tableRow}>
				<Column style={labelCell}>Event:</Column>
				<Column style={valueCell}>{eventName}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Date:</Column>
				<Column style={valueCell}>{eventDate}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Payout type:</Column>
				<Column style={valueCell}>{payoutType}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Amount:</Column>
				<Column style={paymentCell}>{totalAmount}</Column>
			</Row>
		</EmailLayout>
	)
}
