import { Heading, Hr, Link, Row, Column, Text } from "@react-email/components"

import {
	EmailLayout,
	labelCell,
	link,
	paragraph,
	paymentCell,
	subheading,
	tableRow,
	valueCell,
} from "./components"

interface RefundNotificationEmailProps {
	userName: string
	eventName: string
	eventUrl: string
	eventDate: string
	totalRefund: string
	refundConfirmationCode?: string
}

export function RefundNotificationEmail({
	userName,
	eventName,
	eventUrl,
	eventDate,
	totalRefund,
	refundConfirmationCode,
}: RefundNotificationEmailProps) {
	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				BHMC Event Refund Notification
			</Heading>
			<Text style={paragraph}>
				A refund has been triggered by the Bunker Hills Men's Club for {userName}.
			</Text>

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
				<Column style={labelCell}>Refund amount:</Column>
				<Column style={paymentCell}>{totalRefund}</Column>
			</Row>

			<Text style={paragraph}>&nbsp;</Text>

			{refundConfirmationCode && (
				<Text style={paragraph}>Refund Confirmation Code: {refundConfirmationCode}</Text>
			)}

			<Hr />

			<Text style={paragraph}>&nbsp;</Text>
			<Text style={paragraph}>
				Refunds can take up to 5-10 business days to show up in your account. If you don't see this
				refund in that time period, reach out to your club treasurer.
			</Text>
		</EmailLayout>
	)
}
