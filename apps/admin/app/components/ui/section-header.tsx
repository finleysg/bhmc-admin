"use client"

interface SectionHeaderProps {
	children: React.ReactNode
	size?: "lg" | "md" | "sm"
	className?: string
}

export function SectionHeader({ children, size = "lg", className = "" }: SectionHeaderProps) {
	const sizeClasses = {
		lg: "text-lg font-semibold mb-4",
		md: "text-md font-medium mb-2",
		sm: "text-sm font-medium mb-2",
	}

	return <h3 className={`${sizeClasses[size]} ${className}`}>{children}</h3>
}
