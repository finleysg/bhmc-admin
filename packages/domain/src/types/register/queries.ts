import { IsBoolean, IsOptional, IsString } from "class-validator"

export class PlayerQuery {
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
