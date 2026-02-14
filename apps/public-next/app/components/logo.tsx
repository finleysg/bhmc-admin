import Link from "next/link"

export function Logo({ compact }: { compact?: boolean }) {
	return (
		<Link
			href="/"
			className="flex items-center gap-2 font-heading font-bold text-[hsl(var(--primary-foreground))]"
		>
			{compact ? "BHMC" : "Bunker Hills Men's Golf Club"}
		</Link>
	)
}
