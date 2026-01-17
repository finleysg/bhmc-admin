import { merge } from "lodash"

import { EventFee, EventFeeData } from "../../models/event-fee"
import { Payment, PaymentData } from "../../models/payment"
import {
	Registration,
	RegistrationData,
	RegistrationSlot,
	RegistrationSlotData,
} from "../../models/registration"

export const eventFee = (fee?: Partial<EventFeeData>) => {
	return new EventFee(
		merge(
			{},
			{
				id: 1,
				event: 1,
				fee_type: {
					id: 1,
					name: "Event Fee",
					code: "E",
					restriction: "None",
				},
				amount: 5,
				is_required: true,
				display_order: 1,
			},
			fee,
		),
	)
}

export const skinFee = (fee?: Partial<EventFeeData>) => {
	return new EventFee(
		merge(
			{},
			{
				id: 2,
				event: 1,
				fee_type: {
					id: 2,
					name: "Skins Fee",
					code: "S",
					restriction: "None",
				},
				amount: 5,
				is_required: false,
				display_order: 2,
			},
			fee,
		),
	)
}

export const cartFee = (fee?: Partial<EventFeeData>) => {
	return new EventFee(
		merge(
			{},
			{
				id: 3,
				event: 1,
				fee_type: {
					id: 3,
					name: "Cart Fee",
					code: "C",
					restriction: "None",
				},
				amount: 10,
				is_required: false,
				display_order: 3,
			},
			fee,
		),
	)
}

export const createTestRegistration = (registration?: Partial<RegistrationData>) => {
	return new Registration(
		merge(
			{},
			{
				id: 1,
				event: 1,
				course: 4,
				signed_up_by: "John Dough",
				expires: "2021-06-01T00:00:00Z",
				starting_hole: 1,
				starting_order: 0,
				created_date: "2021-05-01T00:00:00Z",
				slots: [
					{
						id: 1,
						event: 1,
						registration: 1,
						hole: 1,
						player: {
							id: 1,
							first_name: "John",
							last_name: "Dough",
						},
						starting_order: 0,
						slot: 0,
					},
					{
						id: 2,
						event: 1,
						registration: 1,
						hole: 1,
						starting_order: 0,
						slot: 1,
					},
					{
						id: 3,
						event: 1,
						registration: 1,
						hole: 1,
						starting_order: 0,
						slot: 2,
					},
					{
						id: 4,
						event: 1,
						registration: 1,
						hole: 1,
						starting_order: 0,
						slot: 3,
					},
				],
			},
			registration,
		),
	)
}

export const createRegistrationSlot = (slot?: Partial<RegistrationSlotData>) => {
	return new RegistrationSlot(
		merge(
			{},
			{
				id: 1,
				event: 1,
				registration: 1,
				hole: 1,
				player: {
					id: 1,
					first_name: "John",
					last_name: "Dough",
				},
				starting_order: 0,
				slot: 0,
				status: "A",
			},
			slot,
		),
	)
}

export const createEmptyPayment = (payment?: Partial<PaymentData>) => {
	return new Payment(
		merge(
			{},
			{
				id: 1,
				event: 1,
				user: 1,
				payment_code: "",
				payment_key: "",
				confirmed: false,
			},
			payment,
		),
	)
}
