import { createInterface } from "node:readline/promises"

/** Asks a question on the terminal (stderr, so stdout stays pure JSON). */
export async function ask(question: string, { hidden = false } = {}): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true })
	if (hidden) {
		// Echo nothing while the password is typed.
		const output = rl as unknown as { _writeToOutput: (s: string) => void }
		output._writeToOutput = (s: string) => {
			if (s.startsWith(question)) process.stderr.write(question)
		}
	}
	try {
		return (await rl.question(question)).trim()
	} finally {
		rl.close()
		if (hidden) process.stderr.write("\n")
	}
}
