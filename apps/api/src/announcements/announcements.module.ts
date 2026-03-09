import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { AnnouncementsController } from "./announcements.controller"
import { AnnouncementsRepository } from "./announcements.repository"
import { AnnouncementsService } from "./announcements.service"

@Module({
	imports: [DatabaseModule],
	controllers: [AnnouncementsController],
	providers: [AnnouncementsRepository, AnnouncementsService],
	exports: [AnnouncementsRepository, AnnouncementsService],
})
export class AnnouncementsModule {}
