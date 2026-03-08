"use client"

type LoadingSpinnerSize = "sm" | "lg"

interface LoadingSpinnerProps {
	size?: LoadingSpinnerSize
	className?: string
}

export function LoadingSpinner({ size = "lg", className }: LoadingSpinnerProps) {
	return (
		<div className={`flex items-center justify-center p-8 ${className || ""}`}>
			<span className={`loading loading-spinner loading-${size}`}></span>
		</div>
	)
}
