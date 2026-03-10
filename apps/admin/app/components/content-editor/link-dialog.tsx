"use client"

import { useEffect, useState } from "react"

import { Modal } from "@/components/ui/modal"

interface LinkDialogProps {
	isOpen: boolean
	onClose: () => void
	onSubmit: (url: string) => void
	initialUrl?: string
}

export function LinkDialog({ isOpen, onClose, onSubmit, initialUrl = "" }: LinkDialogProps) {
	const [url, setUrl] = useState(initialUrl)

	useEffect(() => {
		setUrl(initialUrl)
	}, [initialUrl])

	const handleSave = () => {
		onSubmit(url)
		onClose()
	}

	const handleRemove = () => {
		onSubmit("")
		onClose()
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && url.trim()) {
			e.preventDefault()
			handleSave()
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Insert Link">
			<div className="mt-4 space-y-4">
				<div className="form-control">
					<input
						type="url"
						className="input input-bordered w-full"
						placeholder="https://example.com"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
					/>
				</div>
				<div className="flex justify-end gap-2">
					{initialUrl && (
						<button type="button" className="btn btn-error btn-sm" onClick={handleRemove}>
							Remove
						</button>
					)}
					<button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn-primary btn-sm"
						disabled={!url.trim()}
						onClick={handleSave}
					>
						Save
					</button>
				</div>
			</div>
		</Modal>
	)
}
