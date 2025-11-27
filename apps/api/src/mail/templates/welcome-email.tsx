import { Html, Head, Body, Container, Section, Text, Heading } from "@react-email/components"

interface WelcomeEmailProps {
	name: string
	eventName?: string
}

export function WelcomeEmail({ name, eventName }: WelcomeEmailProps) {
	return (
		<Html>
			<Head />
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={heading}>Welcome to BHMC!</Heading>
					</Section>
					<Section style={content}>
						<Text style={greeting}>Hi {name},</Text>
						<Text style={paragraph}>
							Thank you for joining us! We're excited to have you as part of the BHMC community.
							{eventName && (
								<>
									{" "}
									You've successfully registered for <strong>{eventName}</strong>.
								</>
							)}
						</Text>
						<Text style={paragraph}>If you have any questions, feel free to reach out to us.</Text>
						<Text style={paragraph}>Happy golfing!</Text>
						<Text style={signature}>The BHMC Team</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	)
}

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #f0f0f0",
	borderRadius: "5px",
	margin: "0 auto",
	padding: "20px",
	maxWidth: "600px",
}

const header = {
	borderBottom: "1px solid #f0f0f0",
	paddingBottom: "20px",
	textAlign: "center" as const,
}

const heading = {
	color: "#333",
	fontSize: "28px",
	fontWeight: "bold",
	margin: "0",
}

const content = {
	padding: "20px 0",
}

const greeting = {
	fontSize: "18px",
	fontWeight: "bold",
	margin: "0 0 16px 0",
}

const paragraph = {
	color: "#555",
	fontSize: "16px",
	lineHeight: "24px",
	margin: "0 0 16px 0",
}

const signature = {
	color: "#333",
	fontSize: "16px",
	fontWeight: "bold",
	margin: "20px 0 0 0",
}
