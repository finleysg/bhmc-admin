import { z } from "zod"

import { RegistrationSlotApiSchema } from "./registration"

export const AvailableGroupApiSchema = z.object({
	hole_number: z.number(),
	starting_order: z.number(),
	slots: z.array(RegistrationSlotApiSchema),
})

export type AvailableGroup = z.infer<typeof AvailableGroupApiSchema>
