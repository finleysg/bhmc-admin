import { Transform, Type as TransformerType } from "class-transformer"
import { IsNumber, IsOptional, IsString, ValidateNested } from "class-validator"
import { Player } from "../register/player"
import type { PayoutTypeValue, PayoutValue } from "./choices"

export class TournamentResults {
	@IsNumber()
	id!: number

	@IsNumber()
	tournamentId!: number

	@IsOptional()
	@IsString()
	flight?: string

	@IsNumber()
	playerId!: number

	@IsOptional()
	@IsString()
	teamId?: string

	@IsNumber()
	position!: number

	@IsOptional()
	@IsNumber()
	score?: number

	@IsNumber()
	@Transform(({ value }: { value: unknown }) =>
		typeof value === "string" ? parseFloat(value) : value,
	)
	amount!: number

	@IsOptional()
	@IsString()
	payoutType?: PayoutTypeValue

	@IsOptional()
	@IsString()
	payoutTo?: PayoutValue

	@ValidateNested()
	@TransformerType(() => Player)
	@IsOptional()
	player?: Player
}
