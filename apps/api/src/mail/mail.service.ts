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
	private readonly fromAddress: string

	// TODO: handle authentication for mail server in production
	constructor(private configService: ConfigService) {
		this.fromAddress = this.configService.getOrThrow<string>("MAIL_FROM")
		const host = this.configService.getOrThrow<string>("MAIL_HOST")
		const port = this.configService.getOrThrow<number>("MAIL_PORT")
		const secure = this.configService.get<boolean>("MAIL_SECURE") || false
		// const user = this.configService.get<string>("MAIL_USER")
		// const pass = this.configService.get<string>("MAIL_PASS")

		this.transporter = nodemailer.createTransport({
			host,
			port,
			secure,
			// auth: {
			// 	user: this.configService.get<string>("MAIL_USER"),
			// 	pass: this.configService.get<string>("MAIL_PASS"),
			// },
		})
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

			const info = await this.transporter.sendMail(mailOptions)
			this.logger.log(`Email sent successfully: ${info.messageId}`)
		} catch (error) {
			this.logger.error(
				`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
			throw error
		}
	}
}
