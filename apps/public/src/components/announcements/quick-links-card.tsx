import { GiGolfTee } from "react-icons/gi"

export function QuickLinksCard() {
	return (
		<div className="card mb-4">
			<div className="card-body">
				<h4 className="card-header mb-2">Quick Links</h4>
				<div className="listview">
					<a
						className="listview__item"
						href="https://foreupsoftware.com/index.php/booking/20252/4106#/teetimes"
						rel="noreferrer"
						target="_blank"
					>
						<div className="fs-2 me-2">
							<GiGolfTee />
						</div>
						<div className="listview__content">
							<div className="listview__heading">Bunker Hills Tee Times</div>
						</div>
					</a>
					<a
						className="listview__item"
						href="https://bunkerhillsgolf.com/"
						rel="noreferrer"
						target="_blank"
					>
						<div className="fs-2 me-2">
							<GiGolfTee />
						</div>
						<div className="listview__content">
							<div className="listview__heading">Bunker Hills Home</div>
						</div>
					</a>
					<a className="listview__item" href="https://mpga.net/" rel="noreferrer" target="_blank">
						<div className="fs-2 me-2">
							<GiGolfTee />
						</div>
						<div className="listview__content">
							<div className="listview__heading">Minnesota Public Golf Association</div>
						</div>
					</a>
					<a
						className="listview__item"
						href="https://www.mngolf.org/home"
						rel="noreferrer"
						target="_blank"
					>
						<div className="fs-2 me-2">
							<GiGolfTee />
						</div>
						<div className="listview__content">
							<div className="listview__heading">Minnesota Golf Association</div>
						</div>
					</a>
					<a
						className="listview__item"
						href="https://www.usga.org/rules/rules-and-decisions.html"
						rel="noreferrer"
						target="_blank"
					>
						<div className="fs-2 me-2">
							<GiGolfTee />
						</div>
						<div className="listview__content">
							<div className="listview__heading">Rules of Golf</div>
						</div>
					</a>
					<a
						className="listview__item"
						href="https://www.ghin.com/default.aspx"
						rel="noreferrer"
						target="_blank"
					>
						<div className="fs-2 me-2">
							<GiGolfTee />
						</div>
						<div className="listview__content">
							<div className="listview__heading">Handicaps (GHIN)</div>
						</div>
					</a>
				</div>
			</div>
		</div>
	)
}
