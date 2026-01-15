import { useQuery } from "@tanstack/react-query"

import { Course, CourseApiSchema, CourseData } from "../models/course"
import { getMany } from "../utils/api-client"

export function useCourses() {
	const endpoint = "courses"
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<CourseData>(endpoint, CourseApiSchema),
		select: (data) => data.map((c: CourseData) => new Course(c)),
	})
}
