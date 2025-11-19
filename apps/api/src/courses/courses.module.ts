import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { CoursesRepository } from "./courses.repository"

@Module({
	imports: [DatabaseModule],
	providers: [CoursesRepository],
	exports: [CoursesRepository],
})
export class CoursesModule {}
