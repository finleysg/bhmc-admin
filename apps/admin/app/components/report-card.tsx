"use client"

import React from "react"

import Link from "next/link"
import { HelperText } from "@/components/ui/helper-text"

type Props = {
	title: string
	description?: string
	href: string
	disabled?: boolean
	icon?: React.ReactNode
}

export default function ReportCard({ title, description, href, disabled, icon }: Props) {
	return (
		<div className={`card bg-base-100 shadow-md ${disabled ? "opacity-60" : "hover:shadow-lg"}`}>
			<div className="card-body">
				<div className="flex items-start gap-4">
					<div className="text-2xl">{icon}</div>
					<div className="flex-1">
						<h3 className="card-title">{title}</h3>
						{description && <HelperText>{description}</HelperText>}
					</div>
				</div>

				<div className="card-actions justify-end mt-4">
					{disabled ? (
						<button className="btn btn-primary btn-disabled" aria-disabled="true">
							Coming Soon
						</button>
					) : (
						<Link href={href} className="btn btn-primary">
							View Report
						</Link>
					)}
				</div>
			</div>
		</div>
	)
}
