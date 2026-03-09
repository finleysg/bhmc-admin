import {
	Body,
	Controller,
	Delete,
	Get,
	Inject,
	Param,
	ParseIntPipe,
	Post,
	Put,
} from "@nestjs/common"

import { Admin } from "../auth"
import { AnnouncementsService } from "./announcements.service"
import type { AnnouncementResponse } from "./mappers"

@Controller("announcements")
@Admin()
export class AnnouncementsController {
	constructor(@Inject(AnnouncementsService) private readonly service: AnnouncementsService) {}

	@Get()
	async findAll(): Promise<AnnouncementResponse[]> {
		return this.service.findAll()
	}

	@Get(":id")
	async findById(@Param("id", ParseIntPipe) id: number): Promise<AnnouncementResponse> {
		return this.service.findById(id)
	}

	@Post()
	async create(
		@Body()
		body: {
			title: string
			text: string
			starts: string
			expires: string
			visibility: string
			eventId?: number | null
			documentIds?: number[]
		},
	): Promise<AnnouncementResponse> {
		return this.service.create(body)
	}

	@Put(":id")
	async update(
		@Param("id", ParseIntPipe) id: number,
		@Body()
		body: {
			title?: string
			text?: string
			starts?: string
			expires?: string
			visibility?: string
			eventId?: number | null
			documentIds?: number[]
		},
	): Promise<AnnouncementResponse> {
		return this.service.update(id, body)
	}

	@Delete(":id")
	async delete(@Param("id", ParseIntPipe) id: number): Promise<void> {
		return this.service.delete(id)
	}
}
