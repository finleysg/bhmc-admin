"use client"

import { useEffect, useRef } from "react"

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
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
			<div className="modal-box">
				{title && <h3 className="font-bold text-lg">{title}</h3>}
				{children}
			</div>
			<form method="dialog" className="modal-backdrop">
				<button onClick={handleClose}>close</button>
			</form>
		</dialog>
	)
}
