import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MemberCardProps {
	title: string
	description: string
	icon: LucideIcon
	href: string
}

export function MemberCard({ title, description, icon: Icon, href }: MemberCardProps) {
	return (
		<Link href={href} className="block no-underline">
			<Card
				className={cn(
					"transition-shadow hover:shadow-md cursor-pointer h-full",
					"border-border hover:border-primary/30",
				)}
			>
				<CardContent className="flex items-start gap-4 p-6">
					<div className="rounded-lg bg-primary/10 p-3">
						<Icon className="size-6 text-primary" />
					</div>
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-foreground">{title}</h3>
						<p className="mt-1 text-sm text-muted-foreground">{description}</p>
					</div>
				</CardContent>
			</Card>
		</Link>
	)
}
