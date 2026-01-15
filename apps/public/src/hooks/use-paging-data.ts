import { z, ZodType } from "zod"

import { useQuery } from "@tanstack/react-query"

import { getOne } from "../utils/api-client"

function createPagingSchema<ItemType extends z.ZodTypeAny>(itemSchema: ItemType) {
	return z.object({
		count: z.number(),
		next: z.string().url().nullable(),
		previous: z.string().url().nullable(),
		results: z.array(itemSchema),
	})
}

export function usePagingData(url: string, schema: ZodType) {
	const pagingSchema = createPagingSchema(schema)
	type pagingData = z.infer<typeof pagingSchema>

	return useQuery({
		queryKey: [url],
		queryFn: () => getOne<pagingData>(url, pagingSchema),
		select: (data) => {
			return {
				count: data?.count,
				next: data?.next,
				previous: data?.previous,
				results: data?.results.map((item) => schema.parse(item)) ?? [],
			}
		},
	})
}
