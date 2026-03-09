import { Inject, Injectable } from "@nestjs/common"
import { desc, eq } from "drizzle-orm"

import {
	DrizzleService,
	announcement,
	announcementDocuments,
	document,
	type AnnouncementRow,
	type AnnouncementInsert,
	type AnnouncementDocumentsRow,
	type DocumentRow,
} from "../database"

@Injectable()
export class AnnouncementsRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	async findAll(): Promise<AnnouncementRow[]> {
		return this.drizzle.db.select().from(announcement).orderBy(desc(announcement.id))
	}

	async findById(id: number): Promise<AnnouncementRow | undefined> {
		const [row] = await this.drizzle.db
			.select()
			.from(announcement)
			.where(eq(announcement.id, id))
			.limit(1)
		return row
	}

	async create(data: Omit<AnnouncementInsert, "id">): Promise<AnnouncementRow> {
		const [result] = await this.drizzle.db.insert(announcement).values(data)
		const created = await this.findById(Number(result.insertId))
		if (!created) {
			throw new Error("Failed to create announcement")
		}
		return created
	}

	async update(id: number, data: Partial<AnnouncementInsert>): Promise<AnnouncementRow> {
		await this.drizzle.db.update(announcement).set(data).where(eq(announcement.id, id))
		const updated = await this.findById(id)
		if (!updated) {
			throw new Error(`No announcement found with id ${id}`)
		}
		return updated
	}

	async delete(id: number): Promise<void> {
		await this.drizzle.db.delete(announcement).where(eq(announcement.id, id))
	}

	async findDocumentsByAnnouncementId(
		announcementId: number,
	): Promise<{ announcementDocument: AnnouncementDocumentsRow; document: DocumentRow }[]> {
		return this.drizzle.db
			.select({ announcementDocument: announcementDocuments, document: document })
			.from(announcementDocuments)
			.innerJoin(document, eq(announcementDocuments.documentId, document.id))
			.where(eq(announcementDocuments.announcementId, announcementId))
	}

	async syncDocuments(announcementId: number, documentIds: number[]): Promise<void> {
		await this.drizzle.db
			.delete(announcementDocuments)
			.where(eq(announcementDocuments.announcementId, announcementId))

		if (documentIds.length > 0) {
			await this.drizzle.db.insert(announcementDocuments).values(
				documentIds.map((documentId) => ({
					announcementId,
					documentId,
				})),
			)
		}
	}

	async deleteDocumentsByAnnouncementId(announcementId: number): Promise<void> {
		await this.drizzle.db
			.delete(announcementDocuments)
			.where(eq(announcementDocuments.announcementId, announcementId))
	}
}
