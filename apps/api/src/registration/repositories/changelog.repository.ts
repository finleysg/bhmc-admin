import { desc, eq } from "drizzle-orm"

import { Inject, Injectable, Logger } from "@nestjs/common"

import {
	authUser,
	DrizzleService,
	registrationChangeLog,
	type RegistrationChangeLogInsert,
} from "../../database"

export interface ChangeLogWithActor {
	id: number
	eventId: number
	registrationId: number
	action: string
	actorId: number
	isAdmin: number
	details: unknown
	createdDate: string
	actorFirstName: string
	actorLastName: string
}

@Injectable()
export class ChangeLogRepository {
	private readonly logger = new Logger(ChangeLogRepository.name)

	constructor(@Inject(DrizzleService) private drizzle: DrizzleService) {}

	async create(data: RegistrationChangeLogInsert): Promise<void> {
		await this.drizzle.db.insert(registrationChangeLog).values(data)
	}

	async findByEventId(eventId: number): Promise<ChangeLogWithActor[]> {
		const rows = await this.drizzle.db
			.select({
				id: registrationChangeLog.id,
				eventId: registrationChangeLog.eventId,
				registrationId: registrationChangeLog.registrationId,
				action: registrationChangeLog.action,
				actorId: registrationChangeLog.actorId,
				isAdmin: registrationChangeLog.isAdmin,
				details: registrationChangeLog.details,
				createdDate: registrationChangeLog.createdDate,
				actorFirstName: authUser.firstName,
				actorLastName: authUser.lastName,
			})
			.from(registrationChangeLog)
			.innerJoin(authUser, eq(registrationChangeLog.actorId, authUser.id))
			.where(eq(registrationChangeLog.eventId, eventId))
			.orderBy(desc(registrationChangeLog.createdDate))

		return rows
	}
}
