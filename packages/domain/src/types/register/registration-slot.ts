import { Type as TransformerType } from "class-transformer"
import { IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

import { Hole } from "../courses/hole"
import { Player } from "./player"
import { RegistrationFee } from "./registration-fee"
import type { RegistrationStatusValue } from "./choices"

export class RegistrationSlot {
	@IsNumber()
	id!: number

	@IsNumber()
	registrationId!: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	startingOrder!: number

	@IsNumber()
	slot!: number

	@IsString()
	status!: RegistrationStatusValue

	@IsOptional()
	@IsNumber()
	holeId?: number | null

	@ValidateNested()
	@TransformerType(() => Hole)
	@IsOptional()
	hole?: Hole

	@IsOptional()
	@IsNumber()
	playerId?: number | null

	@ValidateNested()
	@TransformerType(() => Player)
	@IsOptional()
	player?: Player

	@IsOptional()
	@IsString()
	ggId?: string | null

	@IsOptional()
	@ValidateNested({ each: true })
	@TransformerType(() => RegistrationFee)
	fees?: RegistrationFee[]
}
