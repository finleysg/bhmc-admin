import { Link } from "react-router-dom"

import { ClubEventProps } from "../../models/common-props"
import { dayAndDateFormat } from "../../utils/date-utils"

export function EventAdminSubheader({ clubEvent }: ClubEventProps) {
	return (
		<div className="d-flex mb-4">
			<div className="flex-grow-1">
				<h4 className="text-primary-emphasis">
					{clubEvent.name} ({dayAndDateFormat(clubEvent.startDate)}) Administration
				</h4>
			</div>
			<div className="text-end">
				<Link className="btn btn-sm btn-secondary me-2" to={clubEvent.adminUrl}>
					Event Admin Home
				</Link>
				<Link className="btn btn-sm btn-primary" to={clubEvent.eventUrl}>
					Event Detail
				</Link>
			</div>
		</div>
	)
}
