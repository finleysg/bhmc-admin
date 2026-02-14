"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const ContactMessageSchema = z.object({
	full_name: z.string().trim().min(1, "Please enter your name."),
	email: z.string().trim().min(1, "A valid email address is required.").email(),
	message_text: z.string().trim().min(1, "Enter the text of your message."),
})

type ContactMessageData = z.infer<typeof ContactMessageSchema>

function formatZodErrors(error: z.ZodError): Record<string, string> {
	const errors: Record<string, string> = {}
	for (const issue of error.issues) {
		const key = issue.path[0]
		if (key) {
			errors[String(key)] = issue.message
		}
	}
	return errors
}

export default function ContactMessagePage() {
	const router = useRouter()
	const [formData, setFormData] = useState<ContactMessageData>({
		full_name: "",
		email: "",
		message_text: "",
	})
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [submitting, setSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState("")

	function handleChange(field: keyof ContactMessageData, value: string) {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		setSubmitError("")

		const result = ContactMessageSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}

		setSubmitting(true)
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(result.data),
			})

			if (!response.ok) {
				throw new Error("Failed to send message")
			}

			router.push("/contact")
		} catch {
			setSubmitError("Failed to send your message. Please try again.")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="mx-auto max-w-lg">
			<Card>
				<CardHeader>
					<CardTitle>Send Us a Message</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Messages are delivered to the four club officers: president, vice-president, secretary,
						and treasurer. We try to respond promptly, but please be patient if no-one gets back to
						you right away.
					</p>

					{submitError && (
						<div className="rounded-md bg-destructive p-3 text-sm text-destructive-foreground">
							{submitError}
						</div>
					)}

					<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="full_name">Name</Label>
							<Input
								id="full_name"
								type="text"
								value={formData.full_name}
								onChange={(e) => handleChange("full_name", e.target.value)}
							/>
							{errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) => handleChange("email", e.target.value)}
							/>
							{errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="message_text">Message</Label>
							<Textarea
								id="message_text"
								rows={6}
								value={formData.message_text}
								onChange={(e) => handleChange("message_text", e.target.value)}
							/>
							{errors.message_text && (
								<p className="text-sm text-destructive">{errors.message_text}</p>
							)}
						</div>

						<div className="flex gap-2">
							<Button type="submit" disabled={submitting}>
								{submitting ? "Sending..." : "Send Message"}
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={submitting}
								onClick={() => router.push("/contact")}
							>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
