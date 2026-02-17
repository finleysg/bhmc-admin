const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function randomAlphaNumeric(length: number): string {
	let result = ""
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return result
}

export function getCorrelationId(eventId: number): string {
	const key = `${eventId}-correlation-id`
	let correlationId = localStorage.getItem(key)
	if (!correlationId) {
		correlationId = randomAlphaNumeric(12)
		localStorage.setItem(key, correlationId)
	}
	return correlationId
}
