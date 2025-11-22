import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { CoreRepository } from "./core.repository"

@Module({
	imports: [DatabaseModule],
	providers: [CoreRepository],
	exports: [CoreRepository],
})
export class CoreModule {}
