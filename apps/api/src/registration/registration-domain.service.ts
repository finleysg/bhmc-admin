import { Injectable } from "@nestjs/common"

import { toPlayerDomain } from "./domain/mappers"
import { getAge, getFullName } from "./domain/player.domain"
import { PlayerDto } from "./dto/player.dto"

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
