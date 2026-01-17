import { format } from "date-fns"

import { faker } from "@faker-js/faker"
import { build, oneOf, sequence } from "@jackfranklin/test-data-bot"

import { PlayerApiData } from "../../models/player"

export const playerBuilder = build<PlayerApiData>("Player", {
	fields: {
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		email: faker.internet.email(),
		id: sequence((n) => n + 10),
		ghin: faker.number.int({ min: 6, max: 8 }).toString(),
		birth_date: format(faker.date.birthdate(), "yyyy-MM-dd"),
		phone_number: faker.phone.number(),
		tee: oneOf("Club", "Gold"),
		is_member: true,
		last_season: null,
	},
})

export const cardBuilder = build({
	fields: {
		id: faker.string.alphanumeric(8),
		billing_details: {
			name: faker.person.fullName(),
		},
		card: {
			brand: oneOf("visa", "mastercard"),
			last4: faker.number.int({ min: 1000, max: 5999 }).toString(),
			exp_month: faker.date.month(),
			exp_year: faker.date.future().getFullYear(),
		},
	},
})
