"use client"

interface StepIndicatorProps {
	currentStep: number
	totalSteps: number
	label: string
}

export function StepIndicator({ currentStep, totalSteps, label }: StepIndicatorProps) {
	return (
		<h4 className="text-lg font-semibold mb-4">
			Step {currentStep} of {totalSteps}: {label}
		</h4>
	)
}
