import { Spinner } from "./spinner"

interface LoadingSpinnerProps {
	loading: boolean
	paddingTop?: string
}

export function LoadingSpinner({ loading, paddingTop }: LoadingSpinnerProps) {
	if (loading) {
		return (
			<div
				className="flex flex-col items-center justify-center text-5xl"
				style={{ paddingTop: paddingTop ?? "120px" }}
			>
				<Spinner />
			</div>
		)
	}
	return null
}
