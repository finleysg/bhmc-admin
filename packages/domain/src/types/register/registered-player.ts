import { Type as TransformerType } from "class-transformer"
import { IsOptional, ValidateNested } from "class-validator"

import { Course } from "../courses/course"
import { Hole } from "../courses/hole"
import { Player } from "./player"
import { Registration } from "./registration"
import { RegistrationFee } from "./registration-fee"
import { RegistrationSlot } from "./registration-slot"

/**
 * This is a flattened version of a registration slot with
 * a registered player. It's a more convenient shape for exports
 * and reporting.
 */
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
	@TransformerType(() => Hole)
	hole?: Hole

	@IsOptional()
	@ValidateNested({ each: true })
	@TransformerType(() => RegistrationFee)
	fees?: RegistrationFee[]
}
