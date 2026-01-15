import React, { useEffect } from "react"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { useMyRegistrationStatus } from "../../hooks/use-my-registration-status"
import { ClubEvent } from "../../models/club-event"
import { EventStatusType, getRegistrationTypeName, getStartTypeName } from "../../models/codes"
import { dayAndDateFormat, dayDateAndTimeFormat } from "../../utils/date-utils"
import { ManageRegistrationButton } from "../buttons/manage-registration-button"
import { EventAdminButton } from "../buttons/event-admin-button"
import { EventPortalButton } from "../buttons/portal-button"
import { RegisterButton } from "../buttons/register-button"
import { RegisteredButton } from "../buttons/registered-button"
import { OverlaySpinner } from "../spinners/overlay-spinner"

export interface EventDetailProps {
	clubEvent: ClubEvent
	openings?: number
	onRegister: () => void
	onEditRegistration: () => void
}

export function EventDetail({ clubEvent, onRegister, onEditRegistration }: EventDetailProps) {
	// const { data: player } = useMyPlayerRecord()
	const hasSignedUp = useMyRegistrationStatus(clubEvent.id)
	// const isEligible = clubEvent.playerIsEligible(player)

	useEffect(() => {
		window.scrollTo(0, 0)
	}, [])

	return (
		<div className="card mb-4">
			<div className="card-body">
				<OverlaySpinner loading={!clubEvent?.id} />
				<div className="event-header">
					<div className="event-header--title">
						<h3 className="text-primary-emphasis">{clubEvent.name}</h3>
					</div>
					<div className="event-header--actions">
						<EventAdminButton clubEvent={clubEvent} />
						<EventPortalButton clubEvent={clubEvent} />
						<RegisteredButton clubEvent={clubEvent} />
						<ManageRegistrationButton
							clubEvent={clubEvent}
							hasSignedUp={hasSignedUp}
							onClick={onEditRegistration}
						/>
						<RegisterButton clubEvent={clubEvent} hasSignedUp={hasSignedUp} onClick={onRegister} />
					</div>
				</div>
				<div className="card-text">
					{clubEvent.status === EventStatusType.Canceled ? (
						<h4 className="text-danger">Canceled</h4>
					) : null}
					<div className="registration-start-item">
						<div className="label">Event date:</div>
						<div className="value text-primary-emphasis fw-bold">
							{dayAndDateFormat(clubEvent.startDate)}
						</div>
					</div>
					<div className="registration-start-item">
						<div className="label">Start:</div>
						<div className="value">
							{clubEvent.startTime} {getStartTypeName(clubEvent.startType)}
						</div>
					</div>
					<div className="registration-start-item">
						<div className="label">&nbsp;</div>
						<div className="value">{getRegistrationTypeName(clubEvent.registrationType)}</div>
					</div>
					{clubEvent.registrationType !== "None" && (
						<React.Fragment>
							<hr />
							<h6 className="text-primary">Signup Times</h6>
							<div className="registration-start-item">
								<div className="label">Open:</div>
								<div className="value">{dayDateAndTimeFormat(clubEvent.prioritySignupStart)}</div>
							</div>
							<div className="registration-start-item">
								<div className="label">Close:</div>
								<div className="value">{dayDateAndTimeFormat(clubEvent.signupEnd)}</div>
							</div>
							{clubEvent.paymentsEnd && (
								<div className="registration-start-item">
									<div className="label">Changes:</div>
									<div className="value">{dayDateAndTimeFormat(clubEvent.paymentsEnd)}</div>
								</div>
							)}
						</React.Fragment>
					)}
					<hr />

					{hasSignedUp && (
						<p className="text-danger-emphasis">
							<strong>You are registered for this event.</strong>
						</p>
					)}
					{/* {!isEligible && (
            <p className="text-danger">
              {player?.birthDate ? (
                <strong>You are not eligible for this event because you are {player.age}.</strong>
              ) : (
                <strong>
                  You are not eligible for this event because you have not entered your birthdate.
                  Please do so on your My Account page.
                </strong>
              )}
            </p>
          )} */}
					<h4 className="text-primary" style={{ marginTop: "2rem" }}>
						Notes / Format
					</h4>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{clubEvent.notes}</ReactMarkdown>
				</div>
			</div>
		</div>
	)
}
