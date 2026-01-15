import { ComponentPropsWithoutRef } from "react"

import { format } from "date-fns"
import { FiFileText } from "react-icons/fi"

import { BhmcDocument } from "../../models/document"

interface DocumentCardProps extends ComponentPropsWithoutRef<"div"> {
	document: BhmcDocument
}

export function DocumentCard({ document, ...rest }: DocumentCardProps) {
	const updateString = format(document.lastUpdate, "MMMM d, yyyy h:mm aaaa")

	return (
		<a href={document.file} target="_blank" rel="noreferrer" title={document.title}>
			<div className="document-detail bg-light-subtle" {...rest}>
				<div className="text-info me-4">
					<FiFileText className="fs-1" />
				</div>
				<div className="overflow-hidden">
					<p className="document-title text-info" title={document.title}>
						{document.title}
					</p>
					<p className="document-date" title={updateString}>
						<small className="text-secondary">Updated: {updateString}</small>
					</p>
				</div>
			</div>
		</a>
	)
}
