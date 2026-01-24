"use client"

interface HelperTextProps {
	children: React.ReactNode
	className?: string
}

export function HelperText({ children, className }: HelperTextProps) {
	return <p className={`text-sm text-base-content/70 mb-4 ${className || ""}`}>{children}</p>
}
