"use client"

import type { Document } from "@repo/domain/types"
import { Modal } from "@/components/ui/modal"

interface DeleteConfirmModalProps {
	isOpen: boolean
	document: Document | null
	onConfirm: () => void | Promise<void>
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
	const handleConfirm = () => {
		void onConfirm()
	}

	return (
		<Modal isOpen={isOpen} onClose={onCancel} title="Delete Document">
			<p className="py-4">
				Are you sure you want to delete <strong>{document?.title}</strong>? This action cannot be
				undone.
			</p>
			<div className="modal-action">
				<button className="btn btn-ghost" onClick={onCancel} disabled={isDeleting}>
					Cancel
				</button>
				<button className="btn btn-error" onClick={handleConfirm} disabled={isDeleting}>
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
		</Modal>
	)
}
