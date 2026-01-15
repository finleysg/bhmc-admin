import { useQuery } from "@tanstack/react-query"

import { Policy, PolicyApiSchema } from "../models/policy"
import { getMany } from "../utils/api-client"

export function usePolicies(policyType: string) {
	const endpoint = `policies/?policy_type=${policyType}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany(endpoint, PolicyApiSchema),
		select: (data) => data.map((policy) => new Policy(policy)),
	})
}
