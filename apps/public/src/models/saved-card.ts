import { PaymentMethod } from "@stripe/stripe-js"

export class SavedCard {
	paymentMethod: string
	name: string
	brand: string
	last4: string
	cardDescription: string
	expires: string
	isExpired: boolean

	constructor(json?: PaymentMethod) {
		this.paymentMethod = json?.id ?? "new"
		this.name = json?.billing_details.name ?? "Missing name"
		this.brand = json?.card?.brand ?? "Missing card"
		this.last4 = json?.card?.last4 ?? "Missing card"
		this.cardDescription = `${json?.card?.brand} ending in ${json?.card?.last4}`
		this.expires = `${json?.card?.exp_month}/${json?.card?.exp_year}`
		this.isExpired = false
	}
}
