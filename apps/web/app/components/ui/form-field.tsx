"use client"

import React from "react"

interface FormFieldProps {
	label?: string
	error?: string
	children: React.ReactNode
	className?: string
}

export function FormField({ label, error, children, className }: FormFieldProps) {
	return (
		<div className={`form-control ${className || ""}`}>
			{label && (
				<label className="label">
					<span className="label-text">{label}</span>
				</label>
			)}
			{children}
			{error && (
				<label className="label">
					<span className="label-text-alt text-error">{error}</span>
				</label>
			)}
		</div>
	)
}
