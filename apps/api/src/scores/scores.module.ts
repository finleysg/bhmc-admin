import { Module } from "@nestjs/common"

import { CoursesModule } from "../courses/courses.module"
import { DatabaseModule } from "../database/database.module"
import { RegistrationModule } from "../registration/registration.module"
import { ScoresService } from "./scores.service"

@Module({
	imports: [DatabaseModule, RegistrationModule, CoursesModule],
	providers: [ScoresService],
	exports: [ScoresService],
})
export class ScoresModule {}
