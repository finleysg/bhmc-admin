import { ComponentPropsWithoutRef } from "react"

import { IconType } from "react-icons"
import { Link } from "react-router-dom"

export interface MemberCardProps extends ComponentPropsWithoutRef<"div"> {
	title: string
	description: string
	icon: IconType
	action: string
}

export function MemberCard({ title, description, icon: Icon, action, ...rest }: MemberCardProps) {
	return (
		<div className="card member-card" {...rest}>
			<div className="card-body">
				<div className="d-flex align-items-center text-primary mb-3">
					<div className="fs-2 me-2">
						<Icon />
					</div>
					<h5 className="card-title mb-0">{title}</h5>
				</div>
				<p className="card-text">{description}</p>
				<div className="d-flex justify-content-end">
					<Link className="btn btn-sm btn-secondary" to={action}>
						Open
					</Link>
				</div>
			</div>
		</div>
	)
}
