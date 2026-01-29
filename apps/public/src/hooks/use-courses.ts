import { useQuery } from "@tanstack/react-query"

import { Course, CourseApiSchema, CourseData } from "../models/course"
import { getMany } from "../utils/api-client"

const mapper = (data: CourseData[]) => data.map((c) => new Course(c))

export function useCourses() {
	const endpoint = "courses"
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<CourseData>(endpoint, CourseApiSchema),
		select: mapper,
	})
}
