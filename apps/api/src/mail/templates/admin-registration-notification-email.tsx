import React from "react"
import { Heading, Hr, Link, Row, Column, Text, Button, Section } from "@react-email/components"

import {
	EmailLayout,
	labelCell,
	link,
	paragraph,
	paymentCell,
	Player,
	sectionHeading,
	subheading,
	tableRow,
	valueCell,
} from "./components"

interface AdminRegistrationNotificationEmailProps {
	recipientName: string
	eventName: string
	eventUrl: string
	eventDate: string
	eventHoleOrStart?: string
	requiredFees: string
	optionalFees: string
	transactionFees: string
	totalFees: string
	paymentUrl?: string
	players: Player[]
}

const buttonStyle = {
	backgroundColor: "#4f46e5",
	borderRadius: "4px",
	color: "#fff",
	fontWeight: "600" as const,
	padding: "12px 24px",
	textDecoration: "none",
}

export function AdminRegistrationNotificationEmail({
	recipientName,
	eventName,
	eventUrl,
	eventDate,
	eventHoleOrStart,
	requiredFees,
	optionalFees,
	transactionFees,
	totalFees,
	paymentUrl,
	players,
}: AdminRegistrationNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Admin Event Signup Notification
			</Heading>
			<Text style={paragraph}>
				Hi {recipientName}, an administrator has signed you up for a Bunker Hills Golf Event.
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
			{/* Event Fees */}
			<Heading as="h4" style={sectionHeading}>
				Event Fees
			</Heading>
			<Row style={tableRow}>
				<Column style={labelCell}>Required Event Fees:</Column>
				<Column style={paymentCell}>{requiredFees}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Optional Fees:</Column>
				<Column style={paymentCell}>{optionalFees}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Transaction Fees:</Column>
				<Column style={paymentCell}>{transactionFees}</Column>
			</Row>
			<Row style={tableRow}>
				<Column style={labelCell}>Total Event Cost:</Column>
				<Column style={paymentCell}>{totalFees}</Column>
			</Row>

			<Text style={paragraph}>&nbsp;</Text>

			{paymentUrl && (
				<Section style={{ textAlign: "center", margin: "24px 0" }}>
					<Text style={paragraph}>
						You are responsible for payment. Click the button below to complete your payment:
					</Text>
					<Button href={paymentUrl} style={buttonStyle}>
						Complete Payment
					</Button>
				</Section>
			)}

			{/* Players */}
			<Heading as="h4" style={sectionHeading}>
				Players that have been signed up
			</Heading>
			<Hr />
			{players.map((player, index) => (
				<div key={index}>
					<Text style={paragraph}>
						{player.name} ({player.email})
					</Text>
					{player.fees.map((fee, feeIndex) => (
						<Text key={feeIndex} style={paragraph}>
							{fee.description}: {fee.amount}
						</Text>
					))}
					<Hr />
				</div>
			))}

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
