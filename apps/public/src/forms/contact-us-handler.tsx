import { FormEvent, useState } from "react"

import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { ErrorDisplay } from "../components/feedback/error-display"
import { OverlaySpinner } from "../components/spinners/overlay-spinner"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"
import { formatZodErrors } from "../utils/form-utils"
import { ContactMessageData, ContactMessageSchema, ContactUsView } from "./contact-us-view"

const defaultFormData: ContactMessageData = {
	full_name: "",
	email: "",
	message_text: "",
}

export function ContactUsHandler() {
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<Error | null>(null)
	const navigate = useNavigate()

	const [formData, setFormData] = useState<ContactMessageData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})

	const handleChange = (field: keyof ContactMessageData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		const result = ContactMessageSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		try {
			setBusy(true)
			await httpClient(apiUrl("contact"), { body: JSON.stringify(result.data) })
			toast.success("📫 Your message has been sent.")
			navigate("/contact-us")
		} catch (err) {
			setError(err as Error)
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
			<ContactUsView
				formData={formData}
				errors={errors}
				isSubmitting={busy}
				onChange={handleChange}
				onSubmit={handleSubmit}
				onCancel={handleCancel}
			/>
			{error && (
				<ErrorDisplay className="mt-3" error={error.message} delay={10000} onClose={() => 0} />
			)}
		</div>
	)
}
