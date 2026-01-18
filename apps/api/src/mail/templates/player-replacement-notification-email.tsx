import React from "react"
import { Heading, Hr, Link, Row, Column, Text, Button, Section } from "@react-email/components"

import {
	EmailLayout,
	labelCell,
	link,
	paragraph,
	subheading,
	tableRow,
	valueCell,
} from "./components"

interface PlayerReplacementNotificationEmailProps {
	recipientName: string
	eventName: string
	eventUrl: string
	eventDate: string
	eventHoleOrStart?: string
	greenFeeDifference?: number
	paymentUrl?: string
}

const buttonStyle = {
	backgroundColor: "#4f46e5",
	borderRadius: "4px",
	color: "#fff",
	fontWeight: "600" as const,
	padding: "12px 24px",
	textDecoration: "none",
}

export function PlayerReplacementNotificationEmail({
	recipientName,
	eventName,
	eventUrl,
	eventDate,
	eventHoleOrStart,
	greenFeeDifference,
	paymentUrl,
}: PlayerReplacementNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Event Registration Confirmation
			</Heading>
			<Text style={paragraph}>
				Hi {recipientName}, you have been added as a replacement player for a Bunker Hills Golf
				Event.
			</Text>

			{/* Event Details */}
			<Row style={tableRow}>
				<Column style={labelCell}>Event:</Column>
				<Column style={valueCell}>
					<Link href={eventUrl} style={link}>
						{eventName}
					</Link>
				</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Date:</Column>
				<Column style={valueCell}>{eventDate}</Column>
			</Row>
			{eventHoleOrStart && (
				<Row style={tableRow}>
					<Column style={labelCell}>Start:</Column>
					<Column style={valueCell}>{eventHoleOrStart}</Column>
				</Row>
			)}

			{greenFeeDifference !== undefined && greenFeeDifference > 0 && paymentUrl && (
				<>
					<Hr />
					<Heading as="h4" style={subheading}>
						Payment Required
					</Heading>
					<Text style={paragraph}>
						An additional payment of ${greenFeeDifference.toFixed(2)} is required due to fee
						differences.
					</Text>
					<Section style={{ textAlign: "center", margin: "24px 0" }}>
						<Button href={paymentUrl} style={buttonStyle}>
							Complete Payment
						</Button>
					</Section>
				</>
			)}

			<Text style={paragraph}>&nbsp;</Text>
			<Text style={paragraph}>
				Please pay for your green fees in the Pro Shop prior to the event unless you have already
				paid online. Bunker Hills GC reserves the right to check at random for payment receipts.
				Failure to pay for green fees prior to an event will result in disqualification from the
				event and may result in expulsion from BHMC pending a Board of Directors inquiry.
			</Text>
		</EmailLayout>
	)
}
