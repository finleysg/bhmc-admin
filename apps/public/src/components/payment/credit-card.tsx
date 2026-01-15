import { GiCheckMark } from "react-icons/gi"

import { SavedCard } from "../../models/saved-card"
import { CardImage } from "./card-image"
import { getCardName } from "./utils"

interface CreditCardProps {
	card: SavedCard
	selected: boolean
	onSelect: (paymentMethod: string) => void
}

export function CreditCard({ card, selected, onSelect }: CreditCardProps) {
	return (
		<div
			className={"credit-card " + (selected ? "text-primary" : "text-muted")}
			role="button"
			onClick={() => onSelect(card.paymentMethod)}
			onKeyDown={() => onSelect(card.paymentMethod)}
			tabIndex={0}
		>
			<div style={{ flex: "1" }}>
				<CardImage brand={card.brand} />
			</div>
			<div style={{ flex: "4" }}>
				<span className="ms-2">
					{card.paymentMethod === "new" ? (
						<strong className="text-success">Use a new card</strong>
					) : (
						<>
							<strong>{getCardName(card.brand)}</strong> ending in <strong>{card.last4}</strong>
						</>
					)}
				</span>
			</div>
			<div style={{ flex: "1" }} className="text-end">
				{selected && <GiCheckMark />}
			</div>
		</div>
	)
}
