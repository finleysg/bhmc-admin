"use client"

import Link from "next/link"
import React from "react"
import { HelperText } from "@/components/ui/helper-text"

type Props = {
	title: string
	description?: string
	href: string
	disabled?: boolean
	icon?: React.ReactNode
	buttonLabel?: string
	disabledLabel?: string
}

export default function LinkCard({
	title,
	description,
	href,
	disabled,
	icon,
	buttonLabel = "Open",
	disabledLabel = "Locked",
}: Props) {
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
							{disabledLabel}
						</button>
					) : (
						<Link href={href} className="btn btn-primary">
							{buttonLabel}
						</Link>
					)}
				</div>
			</div>
		</div>
	)
}
