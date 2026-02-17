"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { RegistrationProvider } from "@/lib/registration/registration-provider"
import type { ClubEventDetail } from "@/lib/types"

interface RegistrationPageWrapperProps {
	children: (event: ClubEventDetail) => React.ReactNode
}

export function RegistrationPageWrapper({ children }: RegistrationPageWrapperProps) {
	const { event, isLoading } = useEventFromParams()

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	if (!event) {
		return (
			<div className="py-8 text-center">
				<h2 className="text-lg font-semibold">Event not found</h2>
				<p className="text-muted-foreground">The event you are looking for does not exist.</p>
			</div>
		)
	}

	return <RegistrationProvider clubEvent={event}>{children(event)}</RegistrationProvider>
}
