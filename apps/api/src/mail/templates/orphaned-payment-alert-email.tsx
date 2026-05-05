import React from "react"
import { Heading, Row, Column, Text } from "@react-email/components"

import { EmailLayout, labelCell, paragraph, subheading, tableRow, valueCell } from "./components"

interface OrphanedPaymentAlertEmailProps {
	registrationId: number
	paymentId: number
	paymentCode: string | null
	detectedAt: string
}

export function OrphanedPaymentAlertEmail({
	registrationId,
	paymentId,
	paymentCode,
	detectedAt,
}: OrphanedPaymentAlertEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Orphaned Payment Detected
			</Heading>
			<Text style={paragraph}>
				A Stripe payment was captured against a registration that has already been released (userId
				is null and no slots are awaiting payment). The webhook has been refused so Stripe will
				retry — investigate before the retry budget is exhausted.
			</Text>

			<Row style={tableRow}>
				<Column style={labelCell}>Registration ID:</Column>
				<Column style={valueCell}>{registrationId}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Payment ID:</Column>
				<Column style={valueCell}>{paymentId}</Column>
			</Row>
			{paymentCode && (
				<Row style={tableRow}>
					<Column style={labelCell}>Stripe PI:</Column>
					<Column style={valueCell}>{paymentCode}</Column>
				</Row>
			)}
			<Row style={tableRow}>
				<Column style={labelCell}>Detected:</Column>
				<Column style={valueCell}>{detectedAt}</Column>
			</Row>

			<Text style={paragraph}>
				Likely action: refund the captured charge in Stripe and reach out to the player. Check the
				API logs around the detected time for the cancel/cleanup call that orphaned this row.
			</Text>
		</EmailLayout>
	)
}
