"use client"

import type { ReactNode } from "react"

interface HelperTextProps {
	children: ReactNode
	className?: string
}

export function HelperText({ children, className }: HelperTextProps) {
	return <p className={`text-sm text-base-content/70 mb-4 ${className || ""}`}>{children}</p>
}
