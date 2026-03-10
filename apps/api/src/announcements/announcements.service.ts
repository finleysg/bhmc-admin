import { BadRequestException, Inject, Injectable } from "@nestjs/common"

import { toMysqlDatetime } from "../common"

import { AnnouncementsRepository } from "./announcements.repository"
import { type AnnouncementResponse, toAnnouncement, toAnnouncementDocument } from "./mappers"

interface CreateAnnouncementInput {
	title: string
	text: string
	starts: string
	expires: string
	visibility: string
	eventId?: number | null
	documentIds?: number[]
}

interface UpdateAnnouncementInput {
	title?: string
	text?: string
	starts?: string
	expires?: string
	visibility?: string
	eventId?: number | null
	documentIds?: number[]
}

@Injectable()
export class AnnouncementsService {
	constructor(
		@Inject(AnnouncementsRepository) private readonly repository: AnnouncementsRepository,
	) {}

	async findAll(): Promise<AnnouncementResponse[]> {
		const rows = await this.repository.findAll()
		const results: AnnouncementResponse[] = []
		for (const row of rows) {
			const docRows = await this.repository.findDocumentsByAnnouncementId(row.id)
			const documents = docRows.map((d) => toAnnouncementDocument(d.document))
			results.push(toAnnouncement(row, documents))
		}
		return results
	}

	async findById(id: number): Promise<AnnouncementResponse> {
		const row = await this.repository.findById(id)
		if (!row) {
			throw new BadRequestException(`No announcement found with id ${id}`)
		}
		const docRows = await this.repository.findDocumentsByAnnouncementId(id)
		const documents = docRows.map((d) => toAnnouncementDocument(d.document))
		return toAnnouncement(row, documents)
	}

	async create(input: CreateAnnouncementInput): Promise<AnnouncementResponse> {
		const row = await this.repository.create({
			title: input.title,
			text: input.text,
			starts: toMysqlDatetime(input.starts),
			expires: toMysqlDatetime(input.expires),
			visibility: input.visibility,
			eventId: input.eventId ?? null,
		})

		if (input.documentIds && input.documentIds.length > 0) {
			await this.repository.syncDocuments(row.id, input.documentIds)
		}

		return this.findById(row.id)
	}

	async update(id: number, input: UpdateAnnouncementInput): Promise<AnnouncementResponse> {
		const existing = await this.repository.findById(id)
		if (!existing) {
			throw new BadRequestException(`No announcement found with id ${id}`)
		}

		await this.repository.update(id, {
			...(input.title !== undefined && { title: input.title }),
			...(input.text !== undefined && { text: input.text }),
			...(input.starts !== undefined && { starts: toMysqlDatetime(input.starts) }),
			...(input.expires !== undefined && { expires: toMysqlDatetime(input.expires) }),
			...(input.visibility !== undefined && { visibility: input.visibility }),
			...(input.eventId !== undefined && { eventId: input.eventId }),
		})

		if (input.documentIds !== undefined) {
			await this.repository.syncDocuments(id, input.documentIds)
		}

		return this.findById(id)
	}

	async delete(id: number): Promise<void> {
		const existing = await this.repository.findById(id)
		if (!existing) {
			throw new BadRequestException(`No announcement found with id ${id}`)
		}

		await this.repository.deleteDocumentsByAnnouncementId(id)
		await this.repository.delete(id)
	}
}
