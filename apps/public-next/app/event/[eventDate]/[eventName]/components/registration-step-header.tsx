"use client"

import { Badge } from "@/components/ui/badge"
import { useRegistration } from "@/lib/registration/registration-context"

interface RegistrationStepHeaderProps {
	selectedStart?: string
}

export function RegistrationStepHeader({ selectedStart }: RegistrationStepHeaderProps) {
	const { currentStep } = useRegistration()

	return (
		<div className="flex items-center gap-3">
			<h2 className="font-heading text-lg font-semibold">{currentStep.title}</h2>
			{selectedStart && <Badge variant="secondary">Starting at: {selectedStart}</Badge>}
		</div>
	)
}
