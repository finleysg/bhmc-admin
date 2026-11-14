// react-dom/server renders synchronously; @react-email/render needs ESM support Jest lacks.
import { renderToStaticMarkup } from "react-dom/server"

import { AlertDigestEmail } from "../alert-digest-email"

describe("AlertDigestEmail", () => {
	it("lists each finding under its source, with a link when there is one", () => {
		const html = renderToStaticMarkup(
			AlertDigestEmail({
				date: "Jan 12, 2027",
				findings: [
					{
						source: "Readiness",
						title: "Fees missing",
						detail: "Configure fees before signup opens.",
						link: "https://admin.example.com/events/1",
					},
					{ source: "Payouts", title: "Credit not posted", detail: "Post credits in the shop." },
				],
			}),
		)

		expect(html).toContain("Admin alerts for Jan 12, 2027")
		expect(html).toContain("2 items need")
		expect(html).toContain("Readiness")
		expect(html).toContain("Fees missing")
		expect(html).toContain('href="https://admin.example.com/events/1"')
		expect(html).toContain("Credit not posted")
	})
})
