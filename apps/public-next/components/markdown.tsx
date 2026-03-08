import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownProps {
	content: string | undefined | null
}

export function Markdown({ content }: MarkdownProps) {
	if (!content) return null

	return (
		<div className="prose dark:prose-invert max-w-none overflow-x-auto">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	)
}
