import { Injectable } from "@nestjs/common"

import { HoleDto } from "../courses"
import { RegisteredPlayerDto, RegistrationSlotDto } from "../registration"
import { getStart } from "./domain/event.domain"
import { getGroup } from "./domain/group.domain"
import { toEventDomain, toHoleDomain, toSlotDomain } from "./domain/mappers"
import { EventDto } from "./dto/event.dto"

@Injectable()
export class EventsDomainService {
	constructor() {}

	deriveStart(event: EventDto, slot: RegistrationSlotDto, holes: HoleDto[]): string {
		const eventDomain = toEventDomain(event)
		const slotDomain = toSlotDomain(slot)
		const holesDomain = holes.map(toHoleDomain)
		return getStart(eventDomain, slotDomain, holesDomain)
	}

	deriveTeam(
		event: EventDto,
		slot: RegistrationSlotDto,
		holes: HoleDto[],
		courseName: string,
		registrationGroup: RegisteredPlayerDto[],
	): string {
		const start = this.deriveStart(event, slot, holes)
		const slots = registrationGroup.map((x: RegisteredPlayerDto) => toSlotDomain(x.slot))
		return getGroup(event, slot, start, courseName, slots)
	}
}
