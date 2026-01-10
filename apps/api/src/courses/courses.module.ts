import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { CoursesRepository } from "./courses.repository"
import { CoursesService } from "./courses.service"

@Module({
	imports: [DatabaseModule],
	providers: [CoursesRepository, CoursesService],
	exports: [CoursesService],
})
export class CoursesModule {}
