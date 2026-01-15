import { NavLink } from "react-router-dom"

import DamCupLogo from "../assets/img/DamCup.png"
import { CardContent } from "../components/card/content"
import { DamCupResults } from "../components/damcup/dam-cup-results"
import { ClubDocument } from "../components/document/club-document"
import { HistoricalDocuments } from "../components/document/historical-documents"
import { RandomPicList } from "../components/photo/random-pic-list"

export function DamCupScreen() {
	return (
		<div className="content__inner">
			<div className="row">
				<div className="col-xl-3 col-12">
					<div className="card mb-4">
						<div className="card-body">
							<h4 className="card-header">Current Standings</h4>
							<ClubDocument code="CUP" />
						</div>
					</div>
					<div className="card mb-4">
						<div className="card-body">
							<h4 className="card-header mb-2">Past Results</h4>
							<img src={DamCupLogo} alt="Dam Cup Logo" style={{ width: "100%", height: "auto" }} />
							<DamCupResults />
						</div>
					</div>
				</div>
				<div className="col-xl-6 col-12">
					<CardContent contentKey="dam-cup">
						<>
							<RandomPicList tag="Dam Cup" take={2} />
							<NavLink to="/gallery?tag=Dam Cup">Go to the Dam Cup photo gallery</NavLink>
						</>
					</CardContent>
				</div>
				<div className="col-xl-3 col-12">
					<HistoricalDocuments documentTypeCode="D" />
				</div>
			</div>
		</div>
	)
}
