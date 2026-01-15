import { z } from "zod"

export const PolicyApiSchema = z.object({
	id: z.number(),
	policy_type: z.string(),
	title: z.string(),
	description: z.string(),
})

export type PolicyData = z.infer<typeof PolicyApiSchema>

export class Policy {
	id: number
	policyType: string
	title: string
	description: string

	constructor(data: PolicyData) {
		this.id = data.id
		this.policyType = data.policy_type
		this.title = data.title
		this.description = data.description
	}
}

export interface PolicyProps {
	policy: Policy
}
