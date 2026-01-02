import { eq } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import { authUser, DrizzleService, AuthUserRow, AuthUserInsert } from "../database"

@Injectable()
export class AuthUserRepository {
	constructor(private drizzle: DrizzleService) {}

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
}
