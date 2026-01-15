import React, { useEffect } from "react"

import ReactMarkdown from "react-markdown"
import { Link } from "react-router-dom"
import remarkGfm from "remark-gfm"

import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import * as colors from "../../styles/colors"
import { currentSeason } from "../../utils/app-config"
import { AdminLinkButton } from "../buttons/admin-link-button"
import { RegisterButton } from "../buttons/register-button"
import { RegisteredButton } from "../buttons/registered-button"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { EventDetailProps } from "./event-detail"

export function SeasonEventDetail({
	clubEvent,
	onRegister,
}: Pick<EventDetailProps, "clubEvent" | "onRegister">) {
	const { data: player } = useMyPlayerRecord()
	const hasSignedUp = player?.isMember ?? false
	const isReturning = player?.isReturningMember ?? false

	useEffect(() => {
		window.scrollTo(0, 0)
	}, [])

	return (
		<div className="card">
			<AdminLinkButton
				to={clubEvent?.adminUrl}
				label="Event administration home"
				color={colors.teal}
			/>
			<div className="card-body">
				<OverlaySpinner loading={!clubEvent.id} />
				<h3 className="card-header mb-2">{currentSeason} Membership Information</h3>
				{clubEvent.id && (
					<React.Fragment>
						<h6 className="test-info mb-4">Registration open: {clubEvent.signupWindow}</h6>
						<div className="card-text">
							<ReactMarkdown remarkPlugins={[remarkGfm]}>{clubEvent.notes}</ReactMarkdown>
							<div className="row">
								{!hasSignedUp && (
									<div className="col-12">
										<ul data-testid="player-info" className="text-primary">
											<li>
												Your current selection for competition tees is{" "}
												<strong>{player?.tee}</strong>.
											</li>
											<li>
												{!player?.age || isNaN(player.age) ? (
													<span>
														You have not given us your birth date. We cannot give you the senior
														rate for the patron card.
													</span>
												) : (
													<span>
														Your current age is <strong>{player.age}</strong>.
													</span>
												)}
											</li>
											<li>
												{player?.ghin ? (
													<span>
														Your ghin is <strong>{player.ghin}</strong>.
													</span>
												) : (
													<span>
														<strong>You do not have a ghin.</strong>
													</span>
												)}
											</li>
										</ul>
										<p>
											If this information is not correct, please update your profile at the{" "}
											<Link to="/my-account">My Account</Link> page before you register for the{" "}
											{currentSeason} season.
										</p>
									</div>
								)}
								{hasSignedUp && (
									<div className="col-12">
										<p className="text-danger-emphasis">
											It looks like you have already signed up for the {currentSeason} season.
										</p>
									</div>
								)}
								{!hasSignedUp && !isReturning && (
									<div className="col-12">
										<h6 className="text-danger-emphasis">
											As a new member, please indicate your former club (if any) in the notes
											section when you register.
										</h6>
									</div>
								)}
							</div>
							<div className="row">
								<div className="col-12" style={{ textAlign: "right" }}>
									<RegisteredButton clubEvent={clubEvent} style={{ marginRight: ".5rem" }} />
									<RegisterButton
										clubEvent={clubEvent}
										hasSignedUp={hasSignedUp}
										onClick={onRegister}
									/>
								</div>
							</div>
						</div>
					</React.Fragment>
				)}
			</div>
		</div>
	)
}
