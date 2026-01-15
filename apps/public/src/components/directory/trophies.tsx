import { useState } from "react"

import { take } from "lodash"

import { MajorChampion } from "../../models/major-champion"
import { Dialog } from "../dialog/dialog"

interface ChampionshipProps {
	championships: MajorChampion[]
}

const limit = 10

function HasMore({ championships }: ChampionshipProps) {
	const [show, setShow] = useState(false)

	if (championships?.length > limit) {
		return (
			<>
				<h6>
					<button className="btn btn-link" onClick={() => setShow(true)}>
						More...
					</button>
				</h6>
				<Dialog show={show} onClose={() => setShow(false)} title="First Place Finishes">
					{championships.map((c) => (
						<h6 key={c.id} className="text-info mb-2">
							<strong>{c.season}</strong> {c.eventName} ({c.flight})
						</h6>
					))}
				</Dialog>
			</>
		)
	}
	return null
}

export function Trophies({ championships }: ChampionshipProps) {
	const mostRecent = (): MajorChampion[] => {
		return take(championships, limit)
	}

	return (
		<div>
			{mostRecent().map((c) => (
				<h6 key={c.id} className="text-info mb-2">
					🏆 {c.season} {c.eventName}
				</h6>
			))}
			<HasMore championships={championships} />
		</div>
	)
}
