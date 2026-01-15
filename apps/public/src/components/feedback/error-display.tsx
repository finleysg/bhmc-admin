import { ComponentPropsWithoutRef, useState } from "react"

import { BiSolidMessageRoundedError } from "react-icons/bi"

import { useTimeout } from "../../hooks/use-timeout"

interface ErrorDisplayProps extends ComponentPropsWithoutRef<"div"> {
	error: string
	delay?: number | null
	onClose?: () => void
}

export function ErrorDisplay({ error, delay, onClose, ...rest }: ErrorDisplayProps) {
	const [show, setShow] = useState(true)

	const hide = () => {
		setShow(false)
		onClose?.()
	}

	useTimeout(hide, delay ?? null)

	if (!show) return null

	return (
		<div className="alert alert-danger alert-dismissible py-3" role="alert" {...rest}>
			<span className="text-danger-emphasis">
				<BiSolidMessageRoundedError />
			</span>
			<span className="ms-2">{error}</span>
			<button type="button" className="btn-close" onClick={hide} aria-label="Close"></button>
		</div>
	)
}
