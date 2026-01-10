import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { CoreService } from "./core.service"

@Module({
	imports: [DatabaseModule],
	providers: [CoreService],
	exports: [CoreService],
})
export class CoreModule {}
