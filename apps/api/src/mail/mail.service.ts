import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { render } from "@react-email/render"
import {
	formatCurrency,
	eventUrl as getEventUrl,
	getOptionalFees,
	getRequiredFees,
	getStart,
} from "@repo/domain/functions"
import {
	ClubEvent,
	DjangoUser,
	Player,
	ValidatedPayment,
	ValidatedRegistration,
} from "@repo/domain/types"
import * as nodemailer from "nodemailer"
import mailgunTransport from "nodemailer-mailgun-transport"
import type { ReactElement } from "react"

import { RefundNotificationEmail, RegistrationConfirmationEmail, WelcomeEmail } from "./templates"

export interface SendEmailOptions {
	to: string | string[]
	subject: string
	template: ReactElement
}

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name)
	private transporter: nodemailer.Transporter
	private readonly fromAddress: string

	constructor(private configService: ConfigService) {
		this.fromAddress = this.configService.getOrThrow<string>("MAIL_FROM")
		const nodeEnv = this.configService.get<string>("NODE_ENV")

		if (nodeEnv === "development") {
			// SMTP for mailpit
			this.transporter = nodemailer.createTransport({
				host: this.configService.getOrThrow<string>("MAIL_HOST"),
				port: this.configService.getOrThrow<number>("MAIL_PORT"),
				secure: this.configService.get<boolean>("MAIL_SECURE") || false,
			})
		} else {
			// Mailgun for production
			this.transporter = nodemailer.createTransport(
				mailgunTransport({
					auth: {
						api_key: this.configService.getOrThrow<string>("MAILGUN_API_KEY"),
						domain: this.configService.getOrThrow<string>("MAILGUN_SENDER_DOMAIN"),
					},
				}),
			)
		}
	}

	async sendEmail(options: SendEmailOptions): Promise<void> {
		try {
			const { to, subject, template } = options

			// Render React template to HTML
			const html = await render(template)

			// Send email
			const mailOptions = {
				from: this.fromAddress,
				to: Array.isArray(to) ? to.join(",") : to,
				subject,
				html,
			}

			const info = (await this.transporter.sendMail(mailOptions)) as { messageId: string }
			this.logger.log(`Email sent successfully: ${info.messageId}`)
		} catch (error) {
			this.logger.error(
				`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
			throw error
		}
	}

	async sendWelcomeEmail(player: Player, year: string): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const accountUrl = `${websiteUrl}/my-account`

		await this.sendEmail({
			to: player.email,
			subject: "Welcome to Bunker Hills Men's Club!",
			template: WelcomeEmail({ firstName: player.firstName, year, accountUrl }),
		})
	}

	async sendRegistrationConfirmation(
		user: DjangoUser,
		event: ClubEvent,
		registration: ValidatedRegistration,
		payment: ValidatedPayment,
	): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const eventUrl = `${websiteUrl}${getEventUrl(event)}`

		// Get start time/hole from first slot
		const eventHoleOrStart = getStart(event, registration.slots[0], registration.course.holes)

		// Build players array for template
		const players = registration.slots.map((slot) => ({
			name: `${slot.player.firstName} ${slot.player.lastName}`,
			email: slot.player.email,
			fees: slot.fees.map((fee) => ({
				description: fee.eventFee.feeType.name,
				amount: formatCurrency(fee.amount),
			})),
		}))

		const emailProps = {
			userName: registration.signedUpBy,
			eventName: event.name,
			eventUrl,
			eventDate: new Date(event.startDate).toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			}),
			eventHoleOrStart,
			requiredFees: formatCurrency(getRequiredFees(payment)),
			optionalFees: formatCurrency(getOptionalFees(payment)),
			transactionFees: formatCurrency(payment.transactionFee),
			totalFees: formatCurrency(payment.paymentAmount),
			players,
		}

		// Send to registrant with payment code
		await this.sendEmail({
			to: user.email,
			subject: `Registration Confirmation: ${event.name}`,
			template: RegistrationConfirmationEmail({
				...emailProps,
				paymentConfirmationCode: payment.paymentCode,
			}),
		})

		// Send to other players (without payment code)
		const otherRecipients = registration.slots
			.map((slot) => slot.player.email)
			.filter((email) => email !== user.email)

		if (otherRecipients.length > 0) {
			await this.sendEmail({
				to: otherRecipients,
				subject: `Registration Confirmation: ${event.name}`,
				template: RegistrationConfirmationEmail(emailProps),
			})
		}
	}

	async sendRefundNotification(
		email: string,
		userName: string,
		event: ClubEvent,
		refundAmount: number,
		refundCode: string,
	): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const eventUrl = `${websiteUrl}${getEventUrl(event)}`

		const eventDate = new Date(event.startDate).toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		})

		await this.sendEmail({
			to: email,
			subject: `Refund Notification: ${event.name}`,
			template: RefundNotificationEmail({
				userName,
				eventName: event.name,
				eventUrl,
				eventDate,
				totalRefund: formatCurrency(refundAmount),
				refundConfirmationCode: refundCode,
			}),
		})
	}
}
