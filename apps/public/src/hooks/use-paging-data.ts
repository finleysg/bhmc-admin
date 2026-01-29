import { useCallback } from "react"

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

	const mapper = useCallback(
		(data: pagingData | undefined) => ({
			count: data?.count,
			next: data?.next,
			previous: data?.previous,
			results: data?.results.map((item) => schema.parse(item)) ?? [],
		}),
		[schema],
	)

	return useQuery({
		queryKey: [url],
		queryFn: () => getOne<pagingData>(url, pagingSchema),
		select: mapper,
	})
}
