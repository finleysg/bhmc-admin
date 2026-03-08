"use client"

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	children: ReactNode
	className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return

		if (isOpen) {
			if (!dialog.open) dialog.showModal()
		} else {
			if (dialog.open) dialog.close()
		}
	}, [isOpen])

	const handleClose = () => {
		onClose()
	}

	return (
		<dialog ref={dialogRef} className="modal" onClose={handleClose}>
			<div className={`modal-box ${className || ""}`}>
				{title && <h3 className="font-bold text-lg">{title}</h3>}
				{children}
			</div>
			<form method="dialog" className="modal-backdrop">
				<button type="submit">close</button>
			</form>
		</dialog>
	)
}
