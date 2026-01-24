"use client"

import type { ReactNode } from "react"

type AlertType = "error" | "success" | "info" | "warning"

interface AlertProps {
	type: AlertType
	children: ReactNode
	className?: string
}

export function Alert({ type, children, className }: AlertProps) {
	return (
		<div className={`alert alert-${type} ${className || ""}`}>
			<span>{children}</span>
		</div>
	)
}
