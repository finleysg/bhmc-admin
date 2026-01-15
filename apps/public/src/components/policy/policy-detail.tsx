import ReactMarkdown from "react-markdown"
import { useLocation } from "react-router-dom"
import remarkGfm from "remark-gfm"

import { slugify } from "../../models/club-event"
import { PolicyProps } from "../../models/policy"

export function PolicyDetail({ policy }: PolicyProps) {
	const location = useLocation()
	const { title, description } = policy
	const anchor = slugify(title)

	return (
		<div className="card mb-4">
			<div className="card-body">
				<a href={`${location.pathname}#${anchor}`}>
					<h5 id={anchor} className="card-header mb-2" style={{ scrollMarginTop: "90px" }}>
						{title}
					</h5>
				</a>
				<div className="card-text">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
				</div>
			</div>
		</div>
	)
}
