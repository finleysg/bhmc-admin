import { IsBoolean, IsOptional, IsString } from "class-validator"

export class SearchPlayers {
	@IsOptional()
	@IsString()
	searchText?: string

	@IsOptional()
	@IsBoolean()
	isMember?: boolean

	@IsOptional()
	@IsBoolean()
	includeGroup?: boolean
}
