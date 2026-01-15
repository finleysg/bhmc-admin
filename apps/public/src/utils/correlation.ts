const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
const randomAlphaNumeric = (length: number) => {
	let result = ""
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return result
}

export const getCorrelationId = (eventId: number) => {
	let correlationId = localStorage.getItem(`${eventId}-correlation-id`)
	if (!correlationId) {
		correlationId = randomAlphaNumeric(12)
		localStorage.setItem(`${eventId}-correlation-id`, correlationId)
	}
	return correlationId
}
