import { drizzle, MySql2Database } from "drizzle-orm/mysql2"
import * as mysql from "mysql2/promise"

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
	private pool!: mysql.Pool
	public db!: MySql2Database

	async onModuleInit() {
		this.pool = mysql.createPool({
			uri: process.env.DATABASE_URL,
		})
		this.db = drizzle(this.pool)
	}

	async onModuleDestroy() {
		await this.pool.end()
	}
}
