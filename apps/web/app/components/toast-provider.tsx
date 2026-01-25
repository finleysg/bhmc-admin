"use client"

import { Toaster } from "react-hot-toast"

export function ToastProvider() {
	return (
		<Toaster
			position="top-right"
			toastOptions={{
				duration: 4000,
				success: {
					className: "!bg-success !text-success-content",
				},
				error: {
					className: "!bg-error !text-error-content",
				},
			}}
		/>
	)
}
