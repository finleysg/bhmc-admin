import { ComponentPropsWithoutRef, PropsWithChildren, useEffect, useRef } from "react"

interface ModalProps extends ComponentPropsWithoutRef<"dialog"> {
	show: boolean
}

export function Modal({ children, show, ...rest }: PropsWithChildren<ModalProps>) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		if (show && !dialogRef.current?.open) {
			dialogRef.current?.showModal()
		} else if (!show && dialogRef.current?.open) {
			dialogRef.current?.close()
		}
	}, [show])

	return (
		<dialog className="border-0" ref={dialogRef} {...rest}>
			{children}
		</dialog>
	)
}
