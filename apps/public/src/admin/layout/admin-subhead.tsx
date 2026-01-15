import { Link, useLocation } from "react-router-dom"

export function AdminSubheader() {
	const location = useLocation()
	if (!location?.pathname) {
		console.warn("AdminSubheader: location pathname is null")
		return null
	}
	const isEventAdmin = location.pathname?.split("/").indexOf("event") > -1

	// Do not show this subheader if we're doing event administration,
	// which is on child routes to the main admin route.
	if (isEventAdmin) {
		return null
	}

	return (
		<div className="d-flex mb-4">
			<div className="flex-grow-1">
				<h4 className="text-primary-emphasis">Club Administration</h4>
			</div>
			<div className="text-end">
				<Link className="btn btn-sm btn-secondary me-2" to="/admin">
					Admin Home
				</Link>
				<Link className="btn btn-sm btn-primary" to="/home">
					Home
				</Link>
			</div>
		</div>
	)
}
