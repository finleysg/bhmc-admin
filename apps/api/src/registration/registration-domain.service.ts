import { Injectable } from "@nestjs/common"
import { PlayerDto } from "@repo/domain"

import { toPlayerDomain } from "./domain/mappers"
import { getAge, getFullName } from "./domain/player.domain"

@Injectable()
export class RegistrationDomainService {
	constructor() {}

	derivePlayerAge(player: PlayerDto): number {
		const playerDomain = toPlayerDomain(player)
		const ageRes = getAge(playerDomain, new Date())
		return typeof ageRes.age === "number" ? ageRes.age : 0
	}

	derivePlayerName(player: PlayerDto): string {
		const playerDomain = toPlayerDomain(player)
		return getFullName(playerDomain)
	}
}
