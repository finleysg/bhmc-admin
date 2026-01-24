import { CourseInRound } from "../../models/scores"

interface CourseFilterChipsProps {
	courses: CourseInRound[]
	selectedCourseIds: number[]
	onToggleCourse: (courseId: number) => void
}

export function CourseFilterChips({ courses, selectedCourseIds, onToggleCourse }: CourseFilterChipsProps) {
	const isSelected = (courseId: number) => selectedCourseIds.includes(courseId)

	const chipClass = (course: CourseInRound) => {
		const baseClass = "badge rounded-pill me-2 mb-2"
		const colorClass = `bg-${course.name.toLowerCase()}`
		const activeClass = isSelected(course.id) ? "" : "opacity-50"
		return `${baseClass} ${colorClass} ${activeClass}`
	}

	return (
		<div className="mb-3">
			{courses.map((course) => (
				<button
					key={course.id}
					type="button"
					className={chipClass(course)}
					onClick={() => onToggleCourse(course.id)}
					style={{
						cursor: "pointer",
						border: "none",
						fontSize: "0.9rem",
						padding: "0.5rem 1rem",
					}}
				>
					{course.name}
				</button>
			))}
		</div>
	)
}
