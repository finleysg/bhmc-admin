import { useEffect, useRef } from "react"

interface ConfirmDialogProps {
	title?: string
	message: string
	show: boolean
	onClose: (result: boolean) => void
}

export function ConfirmDialog({ title, message, show, onClose }: ConfirmDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		if (show && !dialogRef.current?.open) {
			dialogRef.current?.showModal()
		}
	}, [show])

	const handleClose = (answer: boolean) => {
		onClose(answer)
		dialogRef.current?.close()
	}

	return (
		<dialog ref={dialogRef} className="border-0">
			<div className="text-center p-2">
				{title && <h5 className="text-primary">{title}</h5>}
				<div className="p-2">{message}</div>
				<div className="mt-4">
					<button className="btn btn-sm btn-light me-2" onClick={() => handleClose(false)}>
						No
					</button>
					<button className="btn btn-sm btn-primary" onClick={() => handleClose(true)}>
						Yes
					</button>
				</div>
			</div>
		</dialog>
	)
}
