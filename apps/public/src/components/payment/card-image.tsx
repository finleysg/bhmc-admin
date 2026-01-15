import {
	FaCcAmex,
	FaCcDinersClub,
	FaCcDiscover,
	FaCcJcb,
	FaCcMastercard,
	FaCcVisa,
} from "react-icons/fa"
import { GoPlus } from "react-icons/go"

interface CardImageProps {
	brand: string
}

function getCardImage(brand: string) {
	switch (brand) {
		case "visa":
			return <FaCcVisa />
		case "mastercard":
			return <FaCcMastercard />
		case "discover":
			return <FaCcDiscover />
		case "amex":
			return <FaCcAmex />
		case "jcb":
			return <FaCcJcb />
		case "diners":
			return <FaCcDinersClub />
		default:
			return <GoPlus className="text-success" />
	}
}

export function CardImage({ brand }: CardImageProps) {
	return <div className="text-secondary card-image">{getCardImage(brand)}</div>
}
