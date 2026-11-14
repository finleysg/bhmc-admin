import React from "react"
import { Heading, Link, Section, Text } from "@react-email/components"

import {
	EmailLayout,
	link as linkStyle,
	paragraph,
	sectionHeading,
	subheading,
} from "../mail/templates/components"

import type { AlertDigest } from "./alerts.types"

interface AlertDigestEmailProps {
	date: string
	findings: AlertDigest["findings"]
}

/** The daily admin alert email: one recipient's findings, grouped by source. */
export function AlertDigestEmail({ date, findings }: AlertDigestEmailProps) {
	const sources = [...new Set(findings.map((f) => f.source))]

	return (
		<EmailLayout>
			<Heading as="h3" style={subheading}>
				Admin alerts for {date}
			</Heading>
			<Text style={paragraph}>
				{findings.length === 1 ? "One item needs" : `${findings.length} items need`} your attention.
			</Text>
			{sources.map((source) => (
				<Section key={source}>
					<Heading as="h4" style={sectionHeading}>
						{source}
					</Heading>
					{findings
						.filter((f) => f.source === source)
						.map((finding, i) => (
							<Text key={i} style={paragraph}>
								<strong>{finding.title}</strong>
								<br />
								{finding.detail}
								{finding.link && (
									<>
										<br />
										<Link href={finding.link} style={linkStyle}>
											Open in admin
										</Link>
									</>
								)}
							</Text>
						))}
				</Section>
			))}
		</EmailLayout>
	)
}
