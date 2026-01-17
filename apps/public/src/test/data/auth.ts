import { faker } from "@faker-js/faker"
import { build } from "@jackfranklin/test-data-bot"

const password = faker.internet.password()

export const buildLoginForm = build({
	fields: {
		email: faker.internet.email(),
		password: faker.internet.password(),
	},
})

export const buildUser = build({
	fields: {
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		email: faker.internet.email(),
		id: faker.number.int(),
		is_active: true,
		is_authenticated: true,
		is_staff: false,
		groups: [],
	},
})

export const buildAdminUser = build({
	fields: {
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		email: faker.internet.email(),
		id: faker.number.int(),
		is_active: true,
		is_authenticated: true,
		is_staff: true,
		groups: [],
	},
})

export const buildRegisterForm = build({
	fields: {
		first_name: faker.person.firstName(),
		last_name: faker.person.lastName(),
		email: faker.internet.email(),
		ghin: faker.number.int({ min: 6, max: 8 }).toString(),
		password,
		re_password: password,
	},
})
