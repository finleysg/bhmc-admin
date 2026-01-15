import { useState } from "react"

import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { zodResolver } from "@hookform/resolvers/zod"

import { ErrorDisplay } from "../components/feedback/error-display"
import { OverlaySpinner } from "../components/spinners/overlay-spinner"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"
import { ContactMessageData, ContactMessageSchema, ContactUsView } from "./contact-us-view"

export function ContactUsHandler() {
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const navigate = useNavigate()
	const form = useForm<ContactMessageData>({
		resolver: zodResolver(ContactMessageSchema),
	})

	const sendMessage = async (args: ContactMessageData) => {
		try {
			setBusy(true)
			await httpClient(apiUrl("contact"), { body: JSON.stringify(args) })
			toast.success("📫 Your message has been sent.")
			navigate("/contact-us")
		} catch (e) {
			const err = e as Error
			setError(err)
		} finally {
			setBusy(false)
		}
	}

	const handleCancel = () => {
		navigate("/contact-us")
	}

	return (
		<div>
			<OverlaySpinner loading={busy} />
			<ContactUsView form={form} onSubmit={sendMessage} onCancel={handleCancel} />
			{error && (
				<ErrorDisplay className="mt-3" error={error.message} delay={10000} onClose={() => 0} />
			)}
		</div>
	)
}
