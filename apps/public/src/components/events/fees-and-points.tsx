import { useEventRegistrationSlots } from "../../hooks/use-event-registration-slots"
import { RegistrationType } from "../../models/codes"
import { ClubEventProps } from "../../models/common-props"

export function FeesAndPoints({ clubEvent }: ClubEventProps) {
	const { data: slots } = useEventRegistrationSlots(clubEvent.id)

	const openSpots = clubEvent.openSpots(slots ?? [])
	const showAvailableSpots =
		clubEvent.registrationType !== RegistrationType.None &&
		clubEvent.registrationWindow !== "past" &&
		openSpots !== -1 // unlimited

	return (
		<div className="card mb-4">
			<div className="card-body">
				<h4 className="card-header mb-2">Fees and Points</h4>
				<div className="fees-points">
					{clubEvent.fees.map((eventFee) => {
						return (
							<div key={eventFee.id} className="fees-points-item">
								<span className="label">{eventFee.name}</span>
								<span className="value">${eventFee.amount.toFixed(2)}</span>
							</div>
						)
					})}
					{clubEvent.fees
						.filter((fee) => fee.hasOverride)
						.map((eventFee) => {
							return (
								<div key={eventFee.id} className="fees-points-item">
									<span className="label">
										{eventFee.name} ({eventFee.overrideRestriction})
									</span>
									<span className="value">${eventFee.overrideAmount?.toFixed(2)}</span>
								</div>
							)
						})}
					<div className="fees-points-item mt-4">
						<span className="label">Season long points</span>
						<span className="value">{clubEvent.seasonPoints ?? 0}</span>
					</div>
					<div className="fees-points-item">
						<span className="label">Group size</span>
						<span className="value">{clubEvent.groupSize ?? "N/A"}</span>
					</div>
					{showAvailableSpots && (
						<div className="fees-points-item">
							<span className="label">Spots available</span>
							<span className="value">{openSpots}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
