import { format } from "date-fns"
import { GiFireAce } from "react-icons/gi"

import { Ace } from "../../models/ace"

interface AceProps {
	aces: Ace[]
}

export function AceBadge({ aces }: AceProps) {
	if (aces && aces.length > 0) {
		return (
			<div>
				{aces.map((a) => (
					<h6 key={a.id} className="text-info" style={{ marginBottom: ".8rem" }}>
						<GiFireAce style={{ color: "red" }} title="Hole in One!" /> {a.hole} (
						{format(a.shotDate, "yyyy-MM-dd")})
					</h6>
				))}
			</div>
		)
	}
	return null
}
