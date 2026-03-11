import { eq } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"

import { Inject, Injectable } from "@nestjs/common"

import { authUser, DrizzleService, AuthUserRow, AuthUserInsert } from "../database"

@Injectable()
export class AuthUserRepository {
	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	async findById(id: number): Promise<AuthUserRow | null> {
		const [user] = await this.drizzle.db.select().from(authUser).where(eq(authUser.id, id)).limit(1)
		return user ?? null
	}

	async findByUsername(username: string): Promise<AuthUserRow | null> {
		const [user] = await this.drizzle.db
			.select()
			.from(authUser)
			.where(eq(authUser.username, username))
			.limit(1)
		return user ?? null
	}

	async create(data: AuthUserInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(authUser).values(data)
		return Number(result.insertId)
	}

	async update(
		id: number,
		data: Partial<Pick<AuthUserInsert, "firstName" | "lastName" | "email" | "username">>,
		tx?: MySql2Database,
	): Promise<void> {
		const db = tx ?? this.drizzle.db
		await db.update(authUser).set(data).where(eq(authUser.id, id))
	}
}
