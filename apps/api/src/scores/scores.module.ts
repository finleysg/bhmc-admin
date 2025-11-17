import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { ScoresRepository } from "./scores.repository"

@Module({
	imports: [DatabaseModule],
	providers: [ScoresRepository],
	exports: [ScoresRepository],
})
export class ScoresModule {}
