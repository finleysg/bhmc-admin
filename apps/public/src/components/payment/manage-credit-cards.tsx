import { MdRemoveCircle } from "react-icons/md"

import { SavedCard } from "../../models/saved-card"
import { CardImage } from "./card-image"
import { getCardName } from "./utils"

interface ManageCreditCardProps {
	card: SavedCard
	onRemove: (card: SavedCard) => void
}

interface ManageCreditCardsProps {
	cards: SavedCard[]
	onAdd: () => void
	onRemove: (card: SavedCard) => void
}

function ManagedCreditCard({ card, onRemove }: ManageCreditCardProps) {
	return (
		<div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
			<div style={{ flex: "1" }}>
				<CardImage brand={card.brand} />
			</div>
			<div style={{ flex: "4" }}>
				<span className="text-primary ms-2">
					<strong>{getCardName(card.brand)}</strong> ending in <strong>{card.last4}</strong>
				</span>
			</div>
			<div style={{ flex: "2" }}>
				{card.isExpired ? (
					<span className="text-warning">expired</span>
				) : (
					<span>exp {card.expires}</span>
				)}
			</div>
			<div style={{ flex: "1", height: "1.5rem", textAlign: "right" }}>
				<span
					className="text-danger"
					style={{ fontSize: "1.5rem", cursor: "pointer" }}
					role="button"
					onClick={() => onRemove(card)}
					onKeyDown={() => onRemove(card)}
					tabIndex={0}
				>
					<MdRemoveCircle />
				</span>
			</div>
		</div>
	)
}

export function ManageCreditCards({ cards, onAdd, onRemove }: ManageCreditCardsProps) {
	return (
		<div>
			{cards.map((card) => {
				return <ManagedCreditCard key={card.paymentMethod} card={card} onRemove={onRemove} />
			})}
			<div
				style={{ display: "flex", cursor: "pointer" }}
				role="button"
				onClick={() => onAdd()}
				onKeyDown={() => onAdd()}
				tabIndex={0}
			>
				<div className="text-success" style={{ flex: "1" }}>
					<CardImage brand="add" />
				</div>
				<div style={{ flex: "7" }}>
					<span className="text-success ms-2">
						<strong>Add a payment method</strong>
					</span>
				</div>
			</div>
		</div>
	)
}
