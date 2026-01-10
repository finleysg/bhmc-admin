import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { ScoresService } from "./scores.service"

@Module({
	imports: [DatabaseModule],
	providers: [ScoresService],
	exports: [ScoresService],
})
export class ScoresModule {}
