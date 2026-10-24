import { createTransport } from "nodemailer"
import mailgunTransport from "nodemailer-mailgun-transport"

describe("Mailgun transport compatibility", () => {
	it("sends through Nodemailer and preserves the Mailgun message ID", async () => {
		const transport = mailgunTransport({
			auth: { api_key: "test-key", domain: "example.com" },
		}) as ReturnType<typeof mailgunTransport> & {
			messages: { create: (domain: string, data: unknown) => Promise<{ id: string }> }
		}
		const create = jest.spyOn(transport.messages, "create").mockResolvedValue({ id: "test-id" })
		const mailer = createTransport(transport)

		try {
			const result = await mailer.sendMail({
				from: "club@example.com",
				to: ["first@example.com", "second@example.com"],
				cc: "admin@example.com",
				subject: "Registration confirmation",
				html: "<p>Registered</p>",
			})

			expect(result.messageId).toBe("test-id")
			expect(create).toHaveBeenCalledWith(
				"example.com",
				expect.objectContaining({
					to: "first@example.com,second@example.com",
					cc: "admin@example.com",
					html: "<p>Registered</p>",
				}),
			)
		} finally {
			mailer.close()
			create.mockRestore()
		}
	})
})
