import { useEffect, useState } from "react"

interface PaymentStatusIndicatorProps {
	isProcessing: boolean
	step: string
	processingStartTime: number | null
	onForceCancel: () => void
	showForceCancel?: boolean
}

export function PaymentStatusIndicator({
	isProcessing,
	step,
	processingStartTime,
	onForceCancel,
	showForceCancel = false,
}: PaymentStatusIndicatorProps) {
	const [elapsedTime, setElapsedTime] = useState(0)
	const [showTimeout, setShowTimeout] = useState(false)

	useEffect(() => {
		if (!isProcessing || !processingStartTime) {
			setElapsedTime(0)
			setShowTimeout(false)
			return
		}

		const interval = setInterval(() => {
			const elapsed = Math.floor((Date.now() - processingStartTime) / 1000)
			setElapsedTime(elapsed)

			// Show timeout warning after 30 seconds
			if (elapsed >= 30) {
				setShowTimeout(true)
			}
		}, 1000)

		return () => clearInterval(interval)
	}, [isProcessing, processingStartTime])

	if (!isProcessing && !step) {
		return null
	}

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`
	}

	return (
		<div className="payment-status-indicator mb-3">
			<div className="d-flex align-items-center">
				<span className={isProcessing ? "text-primary" : "text-muted"}>
					{step || "Ready to process payment"}
				</span>
				{isProcessing && elapsedTime > 0 && (
					<span className="ms-2 text-muted small">({formatTime(elapsedTime)})</span>
				)}
			</div>

			{showTimeout && (
				<div className="alert alert-warning mt-3 p-2">
					<div className="d-flex justify-content-between align-items-start">
						<div>
							<strong>Payment is taking longer than expected</strong>
							<p className="mb-0 small">
								This can happen due to network issues or bank verification. Please wait a bit longer
								or try canceling and starting over.
							</p>
						</div>
						{(showForceCancel || elapsedTime >= 60) && (
							<button
								className="btn btn-outline-danger btn-sm ms-2 flex-shrink-0"
								onClick={onForceCancel}
								title="Cancel the current payment attempt"
							>
								Force Cancel
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
