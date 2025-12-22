export interface PlayerFee {
	description: string
	amount: string
}

export interface Player {
	name: string
	email: string
	fees: PlayerFee[]
}
