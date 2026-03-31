"use client"

import type { EventSessionWithFees } from "@repo/domain/types"
import { Modal } from "@/components/ui/modal"

interface DeleteConfirmModalProps {
	isOpen: boolean
	session: EventSessionWithFees | null
	onConfirm: () => void | Promise<void>
	onCancel: () => void
	isDeleting: boolean
}

export function DeleteConfirmModal({
	isOpen,
	session,
	onConfirm,
	onCancel,
	isDeleting,
}: DeleteConfirmModalProps) {
	const handleConfirm = () => {
		void onConfirm()
	}

	return (
		<Modal isOpen={isOpen} onClose={onCancel} title="Delete Session">
			<p className="py-4">
				Are you sure you want to delete <strong>{session?.name}</strong>? This action cannot be
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
