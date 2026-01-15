import { isRouteErrorResponse, useRouteError } from "react-router-dom"

export function ErrorScreen() {
	const error = useRouteError() as Error

	const errorMessage = (error: unknown) => {
		if (isRouteErrorResponse(error)) {
			return `${error.status} ${error.statusText}`
		} else if (error instanceof Error) {
			return error.message
		} else if (typeof error === "string") {
			return error
		} else {
			return error?.toString() ?? "Inconceivable! Unkown error."
		}
	}

	return (
		<div id="error-page">
			<h1>Doh!</h1>
			<p>An error occurred.</p>
			<p>
				<i>{errorMessage(error)}</i>
			</p>
		</div>
	)
}
