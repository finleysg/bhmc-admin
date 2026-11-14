import { cn } from "@/lib/utils"

/** A compact grid of read-only label/value pairs, e.g. record metadata above a form. */
export function DetailList({ className, ...props }: React.ComponentProps<"dl">) {
	return (
		<dl className={cn("grid grid-cols-2 gap-2 text-sm sm:grid-cols-3", className)} {...props} />
	)
}

/** One label/value pair in a DetailList. Missing values show as an em dash. */
export function DetailItem({
	label,
	value,
}: {
	label: string
	value: React.ReactNode | null | undefined
}) {
	return (
		<div>
			<dt className="inline text-muted-foreground">{label}:</dt>{" "}
			<dd className="inline">{value ?? "—"}</dd>
		</div>
	)
}
