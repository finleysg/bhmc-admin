import { NavLink } from "react-router-dom"

import { ClubEventProps } from "../../models/common-props"
import { RandomPicList } from "../photo/random-pic-list"

export function EventPhotos({ clubEvent }: ClubEventProps) {
	if (clubEvent.defaultTag) {
		return (
			<div className="card">
				<div className="card-body">
					<h4 className="card-header">Event Photos</h4>
					<RandomPicList tag={clubEvent.defaultTag} take={1} />
					<NavLink to={`/gallery?tag=${clubEvent.defaultTag}`}>
						Go to the {clubEvent.defaultTag} photo gallery
					</NavLink>
				</div>
			</div>
		)
	}

	return null
}
