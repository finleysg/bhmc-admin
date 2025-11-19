import { Type as TransformerType } from "class-transformer"
import { IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"

import { Hole } from "../courses/hole"
import { Player } from "./player"
import { RegistrationFee } from "./registration-fee"

export class RegistrationSlot {
	@IsOptional()
	@IsNumber()
	id?: number

	@IsNumber()
	registrationId!: number

	@IsNumber()
	eventId!: number

	@IsNumber()
	startingOrder!: number

	@IsNumber()
	slot!: number

	@IsString()
	status!: string

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
