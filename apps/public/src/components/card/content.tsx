import { Children, PropsWithChildren } from "react"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { usePageContent } from "../../hooks/use-page-content"
import { OverlaySpinner } from "../spinners/overlay-spinner"

interface CardContentProps {
	contentKey: string
	headerColor?: string
}

export function CardContent({ contentKey, children }: PropsWithChildren<CardContentProps>) {
	const { data: pageContent, status, fetchStatus } = usePageContent(contentKey)

	return (
		<div className="card mb-4">
			<div className="card-body">
				<OverlaySpinner loading={status === "pending" || fetchStatus === "fetching"} />
				<h4 className="card-header mb-2">{pageContent?.title}</h4>
				<div className="card-text">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{pageContent?.content}</ReactMarkdown>
				</div>
				{children && Children.only(children)}
			</div>
		</div>
	)
}
