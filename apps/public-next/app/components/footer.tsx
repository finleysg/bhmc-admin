import Link from "next/link"

export function Footer() {
	return (
		<footer className="border-t bg-[hsl(var(--primary))] py-4 text-center text-sm text-[hsl(var(--primary-foreground))]">
			<div className="flex flex-col items-center gap-2">
				<div className="flex gap-4">
					<Link href="/" className="hover:underline">
						Home
					</Link>
					<Link href="/contact" className="hover:underline">
						Contact Us
					</Link>
					<Link href="/about" className="hover:underline">
						About Us
					</Link>
				</div>
				<p>Crafted with care by Zoomdoggy Design</p>
			</div>
		</footer>
	)
}
