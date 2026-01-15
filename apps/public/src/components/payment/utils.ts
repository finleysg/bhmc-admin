export const getCardName = (brand: string) => {
	switch (brand) {
		case "visa":
			return "Visa"
		case "mastercard":
			return "Mastercard"
		case "discover":
			return "Discover"
		case "jcb":
			return "JCB"
		case "diners":
			return "Diners Club"
		case "amex":
			return "American Express"
		default:
			throw new Error("Unsupported card brand.")
	}
}
