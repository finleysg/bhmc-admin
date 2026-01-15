import { useState } from "react"

import { MdMenuOpen } from "react-icons/md"
import { useMediaQuery } from "usehooks-ts"

import { IconActionButton } from "../buttons/icon-action-button"
import { FriendPickerList, FriendPickerProps } from "./friend-picker-list"

export function FriendPickerPullout({ clubEvent, onSelect }: FriendPickerProps) {
	const [visible, setVisible] = useState(false)
	const matches = useMediaQuery("(min-width: 768px)")

	if (matches) {
		return null
	}

	return (
		<>
			<IconActionButton
				className="float-end text-primary"
				style={{ border: "none", backgroundColor: "transparent", fontSize: "1.4rem" }}
				label="Show Friends List"
				aria-controls="offcanvasNavbar"
				aria-label="Show Friends List"
				onClick={() => setVisible(true)}
			>
				<MdMenuOpen />
			</IconActionButton>
			<div
				id="offcanvasNavbar"
				className={`offcanvas offcanvas-end ${visible ? "show" : ""}`}
				style={{ maxWidth: "240px", marginTop: "72px" }}
			>
				<div className="offcanvas-header">
					<h5 className="offcanvas-title text-primary">My Friends</h5>
					<button
						type="button"
						className="btn-close"
						aria-label="Close Friends List"
						onClick={() => setVisible(false)}
					></button>
				</div>
				<div className="offcanvas-body">
					<FriendPickerList clubEvent={clubEvent} onSelect={onSelect} />
				</div>
			</div>
		</>
	)
}
