import { Type as TransformerType } from "class-transformer"
import { IsOptional, ValidateNested } from "class-validator"

import { Course } from "../courses/course"
import { Player } from "./player"
import { Registration } from "./registration"
import { RegistrationFee } from "./registration-fee"
import { RegistrationSlot } from "./registration-slot"

export class RegisteredPlayer {
	@IsOptional()
	@TransformerType(() => RegistrationSlot)
	slot?: RegistrationSlot

	@IsOptional()
	@TransformerType(() => Player)
	player?: Player

	@IsOptional()
	@TransformerType(() => Registration)
	registration?: Registration

	@IsOptional()
	@TransformerType(() => Course)
	course?: Course

	@IsOptional()
	@ValidateNested({ each: true })
	@TransformerType(() => RegistrationFee)
	fees?: RegistrationFee[]
}
