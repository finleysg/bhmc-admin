export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/markdown"
import { fetchDjango } from "@/lib/fetchers"
import { slugify } from "@/lib/slugify"
import { cn } from "@/lib/utils"
import type { Policy } from "@/lib/types"

const policyTabs = [
	{ slug: "policies-and-procedures", code: "P", label: "Policies & Procedures" },
	{ slug: "local-rules", code: "R", label: "Local Rules" },
	{ slug: "scoring-and-handicaps", code: "S", label: "Scoring & Handicaps" },
	{ slug: "payment-faqs", code: "F", label: "Online Payment FAQs" },
	{ slug: "new-member-faqs", code: "N", label: "New Member FAQs" },
] as const

interface PolicyPageProps {
	params: Promise<{ policyType: string }>
}

export default async function PolicyTypePage({ params }: PolicyPageProps) {
	const { policyType } = await params
	const tab = policyTabs.find((t) => t.slug === policyType)

	if (!tab) {
		notFound()
	}

	const policies = await fetchDjango<Policy[]>(`/policies/?policy_type=${tab.code}`)

	return (
		<div className="space-y-6">
			<nav className="flex flex-wrap gap-1 rounded-lg border bg-muted p-1">
				{policyTabs.map((t) => (
					<Link
						key={t.slug}
						href={`/policies/${t.slug}`}
						className={cn(
							"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
							t.slug === policyType
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{t.label}
					</Link>
				))}
			</nav>

			<div className="space-y-4">
				{policies.map((policy) => {
					const anchor = slugify(policy.title)
					return (
						<Card key={policy.id} id={anchor} className="scroll-mt-24">
							<CardHeader>
								<CardTitle>
									<a href={`/policies/${policyType}#${anchor}`} className="hover:underline">
										{policy.title}
									</a>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Markdown content={policy.description} />
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
