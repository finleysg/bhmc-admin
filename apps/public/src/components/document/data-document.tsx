import { ComponentPropsWithoutRef, ReactNode } from "react"

import { format } from "date-fns"
import { FiFileText } from "react-icons/fi"

import { BhmcDocument } from "../../models/document"
import { IconActionButton } from "../buttons/icon-action-button"

interface DataDocumentCardProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
	document: BhmcDocument
	selectLabel: string
	actionLabel: string
	icon: ReactNode
	onSelect: (document: BhmcDocument) => void
	onAction: (document: BhmcDocument) => void
}

export function DataDocument({
	document,
	selectLabel,
	actionLabel,
	icon,
	onSelect,
	onAction,
	...rest
}: DataDocumentCardProps) {
	const updateString = format(document.lastUpdate, "MMMM d, yyyy h:mm aaaa")

	return (
		<div className="document-detail" {...rest}>
			<div className="text-muted" style={{ marginRight: "1rem" }}>
				<IconActionButton label={selectLabel} onClick={() => onSelect(document)}>
					<FiFileText style={{ fontSize: "1.5rem" }} />
				</IconActionButton>
			</div>
			<div style={{ overflow: "hidden" }}>{document.title}</div>
			{updateString && (
				<div>
					<small className="text-muted">({updateString})</small>
				</div>
			)}
			<div>
				<IconActionButton label={actionLabel} onClick={() => onAction(document)}>
					{icon}
				</IconActionButton>
			</div>
		</div>
	)
}
