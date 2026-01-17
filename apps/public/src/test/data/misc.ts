import { faker } from "@faker-js/faker"
import { build, oneOf, sequence } from "@jackfranklin/test-data-bot"

export const newsBuilder = build("Announcement", {
	fields: {
		id: sequence((n) => n + 10),
		title: faker.word.words(4),
		text: faker.lorem.paragraph(),
		visibility: oneOf("M", "A", "N"),
		starts: faker.date.past(),
		expires: faker.date.soon(),
	},
})
