import { Heading, Hr, Link, Row, Column, Text } from "@react-email/components"

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

interface RegistrationUpdateEmailProps {
	userName: string
	eventName: string
	eventUrl: string
	eventDate: string
	eventHoleOrStart: string
	requiredFees: string
	optionalFees: string
	transactionFees: string
	totalFees: string
	paymentConfirmationCode?: string
	players: Player[]
}

export function RegistrationUpdateEmail({
	userName,
	eventName,
	eventUrl,
	eventDate,
	eventHoleOrStart,
	requiredFees,
	optionalFees,
	transactionFees,
	totalFees,
	paymentConfirmationCode,
	players,
}: RegistrationUpdateEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				BHMC Event Signup Change
			</Heading>
			<Text style={paragraph}>
				You have been signed up for a Bunker Hills Golf Event by {userName}.
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
			<Row style={tableRow}>
				<Column style={labelCell}>Start:</Column>
				<Column style={valueCell}>{eventHoleOrStart}</Column>
			</Row>

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

			{paymentConfirmationCode && (
				<Text style={paragraph}>Payment Confirmation Code: {paymentConfirmationCode}</Text>
			)}

			{/* Players */}
			<Heading as="h4" style={sectionHeading}>
				Players that have been added or updated
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
		</EmailLayout>
	)
}
