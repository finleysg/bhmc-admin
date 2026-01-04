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
import { wrapError } from "../common/errors"
import {
	ClubEvent,
	CompletePayment,
	DjangoUser,
	Player,
	CompleteRegistration,
} from "@repo/domain/types"
import * as nodemailer from "nodemailer"
import mailgunTransport from "nodemailer-mailgun-transport"
import type { ReactElement } from "react"

import {
	AdminRegistrationNotificationEmail,
	MatchPlayEmail,
	RefundNotificationEmail,
	RegistrationConfirmationEmail,
	RegistrationUpdateEmail,
	WelcomeEmail,
} from "./templates"
import { WelcomeBackEmail } from "./templates/welcome-back-email"

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
			const to = Array.isArray(options.to) ? options.to.join(",") : options.to
			const wrapped = wrapError(error, `sendEmail to ${to}`)
			this.logger.error({ message: wrapped.message, cause: wrapped.cause, stack: wrapped.stack })
			throw wrapped
		}
	}

	async sendWelcomeEmail(player: Pick<Player, "firstName" | "email">, year: string): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const accountUrl = `${websiteUrl}/my-account`

		await this.sendEmail({
			to: player.email,
			subject: "Welcome to the Bunker Hills Men's Club!",
			template: WelcomeEmail({ firstName: player.firstName, year, accountUrl }),
		})
	}

	async sendWelcomeBackEmail(
		player: Pick<Player, "firstName" | "email">,
		year: string,
	): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const accountUrl = `${websiteUrl}/my-account`

		await this.sendEmail({
			to: player.email,
			subject: "It's Great to Have You Back!",
			template: WelcomeBackEmail({ firstName: player.firstName, year, accountUrl }),
		})
	}

	async sendMatchPlayEmail(
		player: Pick<Player, "firstName" | "email">,
		year: string,
	): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const matchplayUrl = `${websiteUrl}/match-play`

		await this.sendEmail({
			to: player.email,
			subject: `${year} Season Long Match Play Registration`,
			template: MatchPlayEmail({ firstName: player.firstName, year, matchplayUrl }),
		})
	}

	async sendRegistrationConfirmation(
		user: DjangoUser,
		event: ClubEvent,
		registration: CompleteRegistration,
		payment: CompletePayment,
	): Promise<void> {
		const { emailProps, otherRecipients } = this.buildRegistrationEmailData(
			user,
			event,
			registration,
			payment,
		)

		await this.sendEmail({
			to: user.email,
			subject: `Registration Confirmation: ${event.name}`,
			template: RegistrationConfirmationEmail({
				...emailProps,
				paymentConfirmationCode: payment.paymentCode,
			}),
		})

		if (otherRecipients.length > 0) {
			await this.sendEmail({
				to: otherRecipients,
				subject: `Registration Confirmation: ${event.name}`,
				template: RegistrationConfirmationEmail(emailProps),
			})
		}
	}

	async sendRegistrationUpdate(
		user: DjangoUser,
		event: ClubEvent,
		registration: CompleteRegistration,
		payment: CompletePayment,
	): Promise<void> {
		const { emailProps, otherRecipients } = this.buildRegistrationEmailData(
			user,
			event,
			registration,
			payment,
		)

		await this.sendEmail({
			to: user.email,
			subject: `Registration Update: ${event.name}`,
			template: RegistrationUpdateEmail({
				...emailProps,
				paymentConfirmationCode: payment.paymentCode,
			}),
		})

		if (otherRecipients.length > 0) {
			await this.sendEmail({
				to: otherRecipients,
				subject: `Registration Update: ${event.name}`,
				template: RegistrationUpdateEmail(emailProps),
			})
		}
	}

	private buildRegistrationEmailData(
		user: DjangoUser,
		event: ClubEvent,
		registration: CompleteRegistration,
		payment: CompletePayment,
	) {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const eventUrl = `${websiteUrl}${getEventUrl(event)}`
		const eventHoleOrStart = getStart(event, registration.slots[0], registration.course.holes)

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

		const otherRecipients = registration.slots
			.map((slot) => slot.player.email)
			.filter((email) => email !== user.email)

		return { emailProps, otherRecipients }
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

	async sendAdminRegistrationNotification(
		event: ClubEvent,
		registration: CompleteRegistration,
		paymentId: number,
		paymentUserEmail: string,
		collectPayment: boolean,
	): Promise<void> {
		const websiteUrl = this.configService.getOrThrow<string>("WEBSITE_URL")
		const eventUrl = `${websiteUrl}${getEventUrl(event)}`
		const paymentUrl = `${websiteUrl}/registration/${registration.id}/payment/${paymentId}`

		const eventHoleOrStart = getStart(event, registration.slots[0], registration.course.holes)

		const players = registration.slots.map((slot) => ({
			name: `${slot.player.firstName} ${slot.player.lastName}`,
			email: slot.player.email,
			fees: slot.fees.map((fee) => ({
				description: fee.eventFee.feeType.name,
				amount: formatCurrency(fee.amount),
			})),
		}))

		const requiredFees = registration.slots.reduce(
			(sum, slot) =>
				sum + slot.fees.filter((f) => f.eventFee.isRequired).reduce((s, f) => s + f.amount, 0),
			0,
		)
		const optionalFees = registration.slots.reduce(
			(sum, slot) =>
				sum + slot.fees.filter((f) => !f.eventFee.isRequired).reduce((s, f) => s + f.amount, 0),
			0,
		)
		const totalFees = requiredFees + optionalFees
		const transactionFee = totalFees * 0.03

		const emailProps = {
			eventName: event.name,
			eventUrl,
			eventDate: new Date(event.startDate).toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			}),
			eventHoleOrStart,
			requiredFees: formatCurrency(requiredFees),
			optionalFees: formatCurrency(optionalFees),
			transactionFees: formatCurrency(transactionFee),
			totalFees: formatCurrency(totalFees + transactionFee),
			players,
		}

		// Send to each player individually
		for (const slot of registration.slots) {
			const recipientEmail = slot.player.email
			const recipientName = slot.player.firstName
			const isPaymentPlayer = recipientEmail === paymentUserEmail

			try {
				await this.sendEmail({
					to: recipientEmail,
					subject: `Event Registration: ${event.name}`,
					template: AdminRegistrationNotificationEmail({
						...emailProps,
						recipientName,
						paymentUrl: isPaymentPlayer && collectPayment ? paymentUrl : undefined,
					}),
				})
			} catch (error) {
				this.logger.error(
					`Failed to send admin registration email to ${recipientEmail}: ${error instanceof Error ? error.message : "Unknown error"}`,
				)
				// Continue sending to other players
			}
		}
	}
}
