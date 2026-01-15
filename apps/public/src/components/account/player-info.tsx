import React from "react"

import { MdEdit, MdPerson } from "react-icons/md"
import { Link } from "react-router-dom"

import { EditAccountHandler } from "../../forms/edit-account-handler"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { LoadingSpinner } from "../spinners/loading-spinner"

export function PlayerInfo() {
	const [mode, setMode] = React.useState("view")
	const { data: player, status, fetchStatus } = useMyPlayerRecord()

	return (
		<div className="pmb-block">
			<div className="pmbb-header">
				<h2>
					<MdPerson /> Player Profile
				</h2>
				<ul className="actions">
					<li>
						<button
							id="edit-account"
							onClick={() => setMode("edit")}
							className={`actions__item bg-transparent`}
							title="Update your player profile"
						>
							<i>
								<MdEdit />
							</i>
						</button>
					</li>
				</ul>
			</div>
			<LoadingSpinner
				loading={status === "pending" || fetchStatus === "fetching"}
				paddingTop="20px"
			/>
			{mode === "view" && player && (
				<div>
					<div style={{ paddingLeft: "30px" }}>
						<dl className="dl-horizontal">
							<dt>Full Name</dt>
							<dd>{player.name}</dd>
						</dl>
						<dl className="dl-horizontal">
							<dt>Email</dt>
							<dd>{player.email}</dd>
						</dl>
						<dl className="dl-horizontal">
							<dt>GHIN</dt>
							<dd>{player.ghin ? player.ghin : "No GHIN"}</dd>
						</dl>
						<dl className="dl-horizontal">
							<dt>Age</dt>
							<dd>{player.age ? player.age : "Not given"}</dd>
						</dl>
						<dl className="dl-horizontal">
							<dt>Phone Number</dt>
							<dd>{player.phoneNumber ? player.phoneNumber : "Not given"}</dd>
						</dl>
						<dl className="dl-horizontal">
							<dt>Tee</dt>
							<dd>{player.tee}</dd>
						</dl>
					</div>
					<div style={{ paddingLeft: "30px", marginTop: "30px" }}>
						<Link to={`/directory/${player.id}`} title="Public Profile">
							View my public profile
						</Link>
					</div>
				</div>
			)}
			{mode === "edit" && player && (
				<React.Fragment>
					<EditAccountHandler player={player} onClose={() => setMode("view")} />
					<p className="text-primary" style={{ marginTop: "1rem" }}>
						<span style={{ fontWeight: "bold" }}>NOTE:</span> If you want to change the tees you
						will play for this season, send us a contact message.
					</p>
				</React.Fragment>
			)}
		</div>
	)
}
