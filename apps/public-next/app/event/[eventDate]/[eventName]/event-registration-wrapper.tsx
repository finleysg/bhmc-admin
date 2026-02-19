"use client"

import type { PropsWithChildren } from "react"

import { RegistrationProvider } from "@/lib/registration/registration-provider"
import type { ClubEventDetail } from "@/lib/types"

interface EventRegistrationWrapperProps {
	clubEvent: ClubEventDetail
}

export function EventRegistrationWrapper({
	clubEvent,
	children,
}: PropsWithChildren<EventRegistrationWrapperProps>) {
	return <RegistrationProvider clubEvent={clubEvent}>{children}</RegistrationProvider>
}
