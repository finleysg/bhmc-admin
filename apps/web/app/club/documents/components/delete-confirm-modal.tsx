"use client"

import type { ClubDocumentCode, Document } from "@repo/domain/types"
import { Modal } from "@/components/ui/modal"

interface DeleteConfirmModalProps {
	isOpen: boolean
	code: ClubDocumentCode | null
	document: Document | null
	onConfirm: () => void | Promise<void>
	onCancel: () => void
	isDeleting: boolean
}

export function DeleteConfirmModal({
	isOpen,
	code,
	document,
	onConfirm,
	onCancel,
	isDeleting,
}: DeleteConfirmModalProps) {
	const handleConfirm = () => {
		void onConfirm()
	}

	return (
		<Modal isOpen={isOpen} onClose={onCancel} title="Remove Document">
			<p className="py-4">
				Are you sure you want to remove the document <strong>{document?.title}</strong> from{" "}
				<strong>{code?.displayName}</strong>?
			</p>
			<p className="text-sm text-base-content/70">
				This will unlink the document from this code. The file will not be deleted and can still be
				accessed from the documents library.
			</p>
			<div className="modal-action">
				<button className="btn btn-ghost" onClick={onCancel} disabled={isDeleting}>
					Cancel
				</button>
				<button className="btn btn-error" onClick={handleConfirm} disabled={isDeleting}>
					{isDeleting ? (
						<>
							<span className="loading loading-spinner loading-sm"></span>
							Removing...
						</>
					) : (
						"Remove"
					)}
				</button>
			</div>
		</Modal>
	)
}
