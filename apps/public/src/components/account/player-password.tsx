import React from "react"

import { MdVpnKey } from "react-icons/md"

import { ChangePasswordHandler } from "../../forms/change-password-handler"

export function PlayerPassword() {
	const [mode, setMode] = React.useState("view")

	return (
		<div className="pmb-block">
			<div className="pmbb-header">
				<h2>
					<MdVpnKey /> My Password
				</h2>
				{mode === "view" && (
					<ul className="actions">
						<li>
							<button
								onClick={() => setMode("edit")}
								className="btn btn-link"
								title="Change your password"
								aria-roledescription="Change password"
							>
								change
							</button>
						</li>
					</ul>
				)}
			</div>
			{mode === "view" && (
				<div style={{ paddingLeft: "30px" }}>
					<p>Click the &quot;change&quot; button to change your password.</p>
				</div>
			)}
			{mode === "edit" && <ChangePasswordHandler onClose={() => setMode("view")} />}
		</div>
	)
}
