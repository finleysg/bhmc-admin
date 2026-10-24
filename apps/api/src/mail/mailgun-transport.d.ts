declare module "nodemailer-mailgun-transport" {
	import type { Transport } from "nodemailer"

	interface MailgunAuth {
		api_key: string
		domain: string
	}

	interface MailgunOptions {
		auth: MailgunAuth
	}

	function mailgunTransport(options: MailgunOptions): Transport<{ messageId: string }>

	export default mailgunTransport
}
