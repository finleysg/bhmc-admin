import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

const links = [
	{
		label: "Bunker Hills Tee Times",
		href: "https://foreupsoftware.com/index.php/booking/20252/4106#/teetimes",
	},
	{ label: "Bunker Hills Home", href: "https://bunkerhillsgolf.com/" },
	{ label: "Minnesota Public Golf Association", href: "https://mpga.net/" },
	{ label: "Minnesota Golf Association", href: "https://www.mngolf.org/home" },
	{ label: "Rules of Golf", href: "https://www.usga.org/rules/rules-and-decisions.html" },
	{ label: "Handicaps (GHIN)", href: "https://www.ghin.com/default.aspx" },
]

export function QuickLinks() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Quick Links</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{links.map((link) => (
						<a
							key={link.href}
							href={link.href}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
						>
							<ExternalLink className="size-4 shrink-0 text-primary" />
							{link.label}
						</a>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
