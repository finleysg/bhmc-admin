"use client"

interface PageHeaderProps {
	children: React.ReactNode
	centered?: boolean
	className?: string
}

export function PageHeader({ children, centered = true, className = "" }: PageHeaderProps) {
	return (
		<h2 className={`text-3xl font-bold mb-6 ${centered ? "text-center" : ""} ${className}`}>
			{children}
		</h2>
	)
}
