"use client"

import type { ReactNode } from "react"
import { XMarkIcon } from "@heroicons/react/16/solid"

interface BadgeProps {
	children: ReactNode
	variant?: "info" | "success" | "warning" | "error"
	onClose?: () => void
	className?: string
}

const variantClasses = {
	info: "badge-info",
	success: "badge-success",
	warning: "badge-warning",
	error: "badge-error",
} as const

export function Badge({ children, variant = "info", onClose, className = "" }: BadgeProps) {
	return (
		<span className={`badge ${variantClasses[variant]} gap-2 ${className}`}>
			{children}
			{onClose && (
				<button
					type="button"
					aria-label="Remove"
					onClick={onClose}
					className="btn btn-ghost btn-xs btn-circle"
				>
					<XMarkIcon className="h-3 w-3" />
				</button>
			)}
		</span>
	)
}
