"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { useAuth } from "@/lib/auth-context"
import { currentSeason } from "@/lib/constants"

interface MembershipContentProps {
	title: string
	content: string
	eventUrl: string | null
}

export function MembershipContent({ title, content, eventUrl }: MembershipContentProps) {
	const router = useRouter()
	const { isAuthenticated, isLoading } = useAuth()

	useEffect(() => {
		if (!isLoading && isAuthenticated && eventUrl) {
			router.push(eventUrl)
		}
	}, [isAuthenticated, isLoading, eventUrl, router])

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Markdown content={content} />
				{!isAuthenticated && (
					<div className="space-y-3">
						<p className="text-primary">
							You need to have an account with us and be logged in to register for the{" "}
							{currentSeason} season.
						</p>
						<div className="flex gap-2">
							<Button asChild>
								<Link href="/sign-in">Login</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/register">Create Account</Link>
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
