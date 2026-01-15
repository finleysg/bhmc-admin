import React from "react"

import { SavedCard } from "../../models/saved-card"
import { CreditCard } from "./credit-card"

interface CreditCardListProps {
	cards: SavedCard[]
	onSelect: (paymentMethod: string) => void
}

export function CreditCardList({ cards, onSelect }: CreditCardListProps) {
	const [selectedCard, setSelectedCard] = React.useState<string>()

	React.useEffect(() => {
		if (cards.length > 0) {
			setSelectedCard(cards[0].paymentMethod)
		}
	}, [cards])

	const handleSelection = (paymentMethod: string) => {
		setSelectedCard(paymentMethod)
		onSelect(paymentMethod)
	}

	return (
		<div>
			{cards.map((card) => {
				return (
					<CreditCard
						key={card.paymentMethod}
						card={card}
						selected={selectedCard === card.paymentMethod}
						onSelect={handleSelection}
					/>
				)
			})}
			<CreditCard
				card={new SavedCard()}
				onSelect={handleSelection}
				selected={selectedCard === "new"}
			/>
		</div>
	)
}
