import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface TestEventInfo {
	id: number
	name: string
	startDate: string
	slug: string
}

export interface TestEventsData {
	testPlayer: { id: number; userId: number }
	events: Record<string, TestEventInfo>
}

let cached: TestEventsData | null = null

export function getTestEvents(): TestEventsData {
	if (cached) return cached
	const filePath = path.resolve(__dirname, "../playwright/.test-events.json")
	cached = JSON.parse(fs.readFileSync(filePath, "utf-8")) as TestEventsData
	return cached
}

export function getTestEventUrl(variant: string): string {
	const data = getTestEvents()
	const event = data.events[variant]
	if (!event) throw new Error(`Unknown test event variant: ${variant}`)
	return `/event/${event.startDate}/${event.slug}`
}
