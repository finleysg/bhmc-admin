import "reflect-metadata"

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
// Silence NestJS Logger during tests
jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common")
	return {
		...actual,
		Logger: jest.fn().mockImplementation(() => ({
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
		})),
	}
})
/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
