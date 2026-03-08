"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"
import { PostHogErrorProvider } from "@/components/posthog-provider"
import { AuthProvider } from "@/lib/auth-context"

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
					},
				},
			}),
	)

	return (
		<PostHogErrorProvider>
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					{children}
					<Toaster />
				</AuthProvider>
			</QueryClientProvider>
		</PostHogErrorProvider>
	)
}
