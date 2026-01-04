import { drizzle, MySql2Database } from "drizzle-orm/mysql2"
import * as mysql from "mysql2/promise"

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common"

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
	private pool!: mysql.Pool
	public db!: MySql2Database

	async onModuleInit() {
		this.pool = mysql.createPool({
			uri: process.env.DATABASE_URL,
		})

		// In non-production environments wrap pool.query/execute to log queries & params.
		// This gives Drizzle a visible query stream for debugging without changing callers.
		const logger = new Logger(DrizzleService.name)
		if (process.env.NODE_ENV !== "production") {
			const originalQuery = (this.pool as any).query.bind(this.pool)
			const originalExecute = (this.pool as any).execute.bind(this.pool)

			;(this.pool as any).query = async (sql: string, params?: any) => {
				const start = Date.now()
				try {
					const res = await originalQuery(sql, params)
					const ms = Date.now() - start
					logger.debug(`[mysql] ${ms}ms ${sql} -- params: ${JSON.stringify(params)}`)
					return res
				} catch (err) {
					logger.error({ message: "MySQL query error", sql, params, err })
					throw err
				}
			}
			;(this.pool as any).execute = async (sql: string, params?: any) => {
				const start = Date.now()
				try {
					const res = await originalExecute(sql, params)
					const ms = Date.now() - start
					logger.debug(`[mysql] ${ms}ms ${sql} -- params: ${JSON.stringify(params)}`)
					return res
				} catch (err) {
					logger.error({ message: "MySQL execute error", sql, params, err })
					throw err
				}
			}
		}

		this.db = drizzle(this.pool)
		// Dummy await to satisfy linter
		await Promise.resolve()
	}

	async onModuleDestroy() {
		await this.pool.end()
	}
}
