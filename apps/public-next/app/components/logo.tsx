import Link from "next/link"

export function Logo({ compact }: { compact?: boolean }) {
	return (
		<Link
			href="/"
			aria-label="Home"
			className="flex items-center gap-2 font-heading font-bold text-primary-foreground"
		>
			{compact ? "BHMC" : "Bunker Hills Men's Golf Club"}
		</Link>
	)
}
