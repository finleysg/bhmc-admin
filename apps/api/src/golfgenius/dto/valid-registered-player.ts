import { Player, RegisteredPlayer, Registration, RegistrationSlot } from "@repo/domain/types"

export type ValidRegisteredPlayer = RegisteredPlayer & {
	player: Player & { id: number }
	registration: Registration & { id: number }
	slot: RegistrationSlot & { id: number }
}
