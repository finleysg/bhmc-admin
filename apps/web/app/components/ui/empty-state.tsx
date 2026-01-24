"use client"

interface EmptyStateProps {
	message: string
	className?: string
}

export function EmptyState({ message, className = "" }: EmptyStateProps) {
	return (
		<div className={`text-center py-12 ${className}`}>
			<p className="text-muted-foreground">{message}</p>
		</div>
	)
}
