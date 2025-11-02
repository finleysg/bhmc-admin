import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { CoursesService } from "./courses.service"

@Module({
	imports: [DatabaseModule],
	providers: [CoursesService],
	exports: [CoursesService],
})
export class CoursesModule {}
