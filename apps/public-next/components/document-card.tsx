import { FileText } from "lucide-react"
import { format, parseISO } from "date-fns"
import { resolvePhotoUrl } from "@/lib/photo-utils"

interface DocumentCardProps {
	title: string
	file: string
	lastUpdate?: string
	variant?: "primary" | "secondary"
}

const variantStyles = {
	primary: "bg-primary/10 text-primary hover:bg-primary/20 [&_.doc-date]:text-primary/60",
	secondary: "bg-secondary/10 text-secondary hover:bg-secondary/20 [&_.doc-date]:text-secondary/60",
}

export function DocumentCard({
	title,
	file,
	lastUpdate,
	variant = "secondary",
}: DocumentCardProps) {
	const formattedDate = lastUpdate
		? format(parseISO(lastUpdate), "MMMM d, yyyy h:mm aaaa")
		: undefined

	return (
		<a
			href={resolvePhotoUrl(file)}
			target="_blank"
			rel="noopener noreferrer"
			className={`flex items-center gap-2 rounded p-2 text-sm transition-colors ${variantStyles[variant]}`}
		>
			<FileText className="size-5 shrink-0" />
			<div className="min-w-0">
				<p className="truncate font-medium">{title}</p>
				{formattedDate && <p className="doc-date truncate text-xs">Updated: {formattedDate}</p>}
			</div>
		</a>
	)
}
