import { eq } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import { adminSetting, authUser, DrizzleService } from "../database"

export interface SettingRow {
	id: number
	key: string
	value: unknown
	updatedAt: string
	updatedBy: string
}

@Injectable()
export class SettingsRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	/** Stored settings, with the name of whoever last changed each. */
	async findAll(db: MySql2Database = this.drizzle.db): Promise<SettingRow[]> {
		const rows = await db
			.select({
				id: adminSetting.id,
				key: adminSetting.key,
				value: adminSetting.value,
				updatedAt: adminSetting.updatedAt,
				firstName: authUser.firstName,
				lastName: authUser.lastName,
			})
			.from(adminSetting)
			.innerJoin(authUser, eq(authUser.id, adminSetting.updatedById))
		return rows.map(({ firstName, lastName, ...row }) => ({
			...row,
			updatedBy: `${firstName} ${lastName}`.trim(),
		}))
	}

	/**
	 * The stored value under SELECT … FOR UPDATE, or undefined if the key has no
	 * row yet (InnoDB still locks the gap, so a concurrent first save waits).
	 */
	async lockValue(tx: MySql2Database, key: string): Promise<{ value: unknown } | undefined> {
		const [row] = await tx
			.select({ value: adminSetting.value })
			.from(adminSetting)
			.where(eq(adminSetting.key, key))
			.for("update")
		return row
	}

	/** Inserts or replaces the value and returns the row id. */
	async save(
		tx: MySql2Database,
		key: string,
		value: unknown,
		updatedById: number,
		updatedAt: string,
	): Promise<number> {
		await tx
			.insert(adminSetting)
			.values({ key, value, updatedById, updatedAt })
			.onDuplicateKeyUpdate({ set: { value, updatedById, updatedAt } })
		const [row] = await tx
			.select({ id: adminSetting.id })
			.from(adminSetting)
			.where(eq(adminSetting.key, key))
		return row.id
	}
}
