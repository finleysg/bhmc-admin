"use client"

interface CardProps {
	shadow?: "xs" | "sm" | "md" | "xl"
	children: React.ReactNode
	className?: string
}

export function Card({ shadow = "md", children, className }: CardProps) {
	return <div className={`card bg-base-100 shadow-${shadow} ${className || ""}`}>{children}</div>
}

interface CardBodyProps {
	children: React.ReactNode
	className?: string
}

export function CardBody({ children, className }: CardBodyProps) {
	return <div className={`card-body ${className || ""}`}>{children}</div>
}

interface CardTitleProps {
	children: React.ReactNode
	className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
	return (
		<h3 className={`card-title text-secondary font-semibold mb-4 ${className || ""}`}>
			{children}
		</h3>
	)
}
