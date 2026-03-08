"use client"

interface EmptyStateProps {
	message: string
	className?: string
}

export function EmptyState({ message, className = "" }: EmptyStateProps) {
	return (
		<div className={`text-center py-12 ${className}`}>
			<p className="text-base-content/70">{message}</p>
		</div>
	)
}
