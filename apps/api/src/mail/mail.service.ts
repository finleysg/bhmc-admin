import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { render } from "@react-email/render"
import * as nodemailer from "nodemailer"
import type { ReactElement } from "react"

export interface SendEmailOptions {
	to: string | string[]
	subject: string
	template: ReactElement
}

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name)
	private transporter: nodemailer.Transporter

	constructor(private configService: ConfigService) {
		this.transporter = nodemailer.createTransport({
			host: this.configService.get<string>("MAIL_HOST"),
			port: this.configService.get<number>("MAIL_PORT"),
			secure: false, // true for 465, false for other ports
			auth: {
				user: this.configService.get<string>("MAIL_USER"),
				pass: this.configService.get<string>("MAIL_PASS"),
			},
		})
	}

	async sendEmail(options: SendEmailOptions): Promise<void> {
		try {
			const { to, subject, template } = options

			// Render React template to HTML
			const html = await render(template)

			// Send email
			const mailOptions = {
				from: this.configService.get<string>("MAIL_FROM"),
				to: Array.isArray(to) ? to.join(",") : to,
				subject,
				html,
			}

			const info = await this.transporter.sendMail(mailOptions)
			this.logger.log(`Email sent successfully: ${info.messageId}`)
		} catch (error) {
			this.logger.error("Failed to send email", error)
			throw error
		}
	}
}
