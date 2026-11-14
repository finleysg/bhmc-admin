import { Loader2 } from "lucide-react"

export default function Loading() {
	return (
		<div className="flex justify-center py-12">
			<Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
		</div>
	)
}
