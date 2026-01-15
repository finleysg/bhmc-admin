import { ComponentPropsWithoutRef } from "react"

import { Course } from "../../models/course"

interface CourseSelectorProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
	courses: Course[]
	selectedCourse?: Course
	onChange: (course: Course) => void
}

export function CourseSelector({
	courses,
	selectedCourse,
	onChange,
	className,
	...rest
}: CourseSelectorProps) {
	return (
		<div className={`btn-group ${className ?? ""}`} role="group" {...rest}>
			{courses.map((course) => (
				<button
					key={course.id}
					type="button"
					className={`btn ${selectedCourse?.id === course.id ? "btn-primary" : "btn-outline-primary"}`}
					onClick={() => onChange(course)}
				>
					{course.name}
				</button>
			))}
		</div>
	)
}
