import { ComponentPropsWithoutRef } from "react"

import { format } from "date-fns"

import { BhmcDocument } from "../../models/document"

interface DocumentCardProps extends ComponentPropsWithoutRef<"div"> {
	document: BhmcDocument
}

export function DocumentView({ document, ...rest }: DocumentCardProps) {
	return (
		<div {...rest}>
			<h6 className="text-primary-emphasis">Existing file</h6>
			<p className="text-primary-emphasis mb-1">{document.title}</p>
			<p className="text-secondary mb-1">
				Last updated on {format(document.lastUpdate, "MMMM d, yyyy h:mm aaaa")}
			</p>
			<p>
				<a href={document.file} target="_blank" rel="noreferrer">
					view file
				</a>
			</p>
		</div>
	)
}
