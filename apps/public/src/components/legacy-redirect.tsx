import { Navigate, useParams } from "react-router-dom"

export function LegacyScoresRedirect() {
	const params = useParams()
	const path = params["*"] || ""
	return <Navigate to={`/member/scores/${path}`} replace />
}
