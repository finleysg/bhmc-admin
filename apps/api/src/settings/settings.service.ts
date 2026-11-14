import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import type { AdminSettingView } from "@repo/domain/types"

import { AuditService, type AuditContext } from "../audit"
import { DrizzleService, toDbString } from "../database"

import {
	isSettingKey,
	SETTING_DEFINITIONS,
	type SettingKey,
	validateSetting,
} from "./settings.definitions"
import { SettingsRepository, type SettingRow } from "./settings.repository"

@Injectable()
export class SettingsService {
	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(SettingsRepository) private readonly repository: SettingsRepository,
		@Inject(AuditService) private readonly audit: AuditService,
	) {}

	/** Every defined setting, with its stored value or its default. */
	async list(): Promise<AdminSettingView[]> {
		const stored = new Map((await this.repository.findAll()).map((row) => [row.key, row]))
		return (Object.keys(SETTING_DEFINITIONS) as SettingKey[]).map((key) =>
			this.toView(key, stored.get(key)),
		)
	}

	/** The current value of one setting, for code that acts on it (e.g. alerts). */
	async get(key: SettingKey): Promise<number> {
		return (await this.list()).find((s) => s.key === key)!.value
	}

	/** Saves a setting and audits the change, in one transaction. */
	async update(key: string, value: unknown, context: AuditContext): Promise<AdminSettingView> {
		if (!isSettingKey(key)) throw new NotFoundException(`Unknown setting ${key}`)
		const error = validateSetting(key, value)
		if (error) throw new BadRequestException(error)

		await this.drizzle.db.transaction(async (tx) => {
			const stored = await this.repository.lockValue(tx, key)
			const before = stored ? stored.value : SETTING_DEFINITIONS[key].default
			if (before === value) return

			const id = await this.repository.save(tx, key, value, context.actorId, toDbString(new Date()))
			await this.audit.record(tx, context, {
				operation: "setting.update",
				entityType: "setting",
				entityId: id,
				before: { [key]: before },
				after: { [key]: value },
			})
		})
		return (await this.list()).find((s) => s.key === key)!
	}

	private toView(key: SettingKey, row: SettingRow | undefined): AdminSettingView {
		const def = SETTING_DEFINITIONS[key]
		return {
			key,
			label: def.label,
			description: def.description,
			type: def.type,
			min: def.min,
			max: def.max,
			unit: def.unit,
			value: row ? (row.value as number) : def.default,
			defaultValue: def.default,
			updatedAt: row?.updatedAt ?? null,
			updatedBy: row?.updatedBy ?? null,
		}
	}
}
