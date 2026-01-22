"use client"

import { useEffect, useRef } from "react"
import type { Document } from "@repo/domain/types"

interface DeleteConfirmModalProps {
	isOpen: boolean
	document: Document | null
	onConfirm: () => void
	onCancel: () => void
	isDeleting: boolean
}

export function DeleteConfirmModal({
	isOpen,
	document,
	onConfirm,
	onCancel,
	isDeleting,
}: DeleteConfirmModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return

		if (isOpen) {
			dialog.showModal()
		} else {
			dialog.close()
		}
	}, [isOpen])

	const handleCancel = () => {
		onCancel()
	}

	return (
		<dialog ref={dialogRef} className="modal" onClose={handleCancel}>
			<div className="modal-box">
				<h3 className="font-bold text-lg">Delete Document</h3>
				<p className="py-4">
					Are you sure you want to delete <strong>{document?.title}</strong>? This action cannot be
					undone.
				</p>
				<div className="modal-action">
					<button className="btn btn-ghost" onClick={handleCancel} disabled={isDeleting}>
						Cancel
					</button>
					<button className="btn btn-error" onClick={onConfirm} disabled={isDeleting}>
						{isDeleting ? (
							<>
								<span className="loading loading-spinner loading-sm"></span>
								Deleting...
							</>
						) : (
							"Delete"
						)}
					</button>
				</div>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button onClick={handleCancel}>close</button>
			</form>
		</dialog>
	)
}
