// Domain mapper from Model to Domain
import { Course, Hole, Tee } from "@repo/domain/types"

import { CourseModel, HoleModel, TeeModel } from "../database/models"

/**
 * Maps database entity to Course
 */
export function mapToCourseModel(entity: Record<string, any>): CourseModel {
	return {
		id: entity.id,
		name: entity.name,
		numberOfHoles: entity.numberOfHoles,
		ggId: entity.ggId,
	}
}

/**
 * Maps database entity to Hole
 */
export function mapToHoleModel(entity: Record<string, any>): HoleModel {
	return {
		id: entity.id,
		holeNumber: entity.holeNumber,
		par: entity.par,
		courseId: entity.courseId,
	}
}

/**
 * Maps database entity to Tee
 */
export function mapToTeeModel(entity: Record<string, any>): TeeModel {
	return {
		id: entity.id,
		name: entity.name,
		ggId: entity.ggId,
		courseId: entity.courseId,
	}
}

/**
 * Maps CourseModel to Course domain class
 */
export function toCourse(model: CourseModel): Course {
	return {
		id: model.id!,
		name: model.name,
		numberOfHoles: model.numberOfHoles,
		ggId: model.ggId,
		tees: model.tees?.map(toTee) || [], // Map tees if present
		holes: model.holes?.map(toHole) || [], // Map holes if present
	}
}

/**
 * Maps TeeModel to Tee domain class
 */
export function toTee(model: TeeModel): Tee {
	return {
		id: model.id,
		name: model.name,
		ggId: model.ggId,
		courseId: model.courseId,
	}
}

/**
 * Maps HoleModel to Hole domain class
 */
export function toHole(model: HoleModel): Hole {
	return {
		id: model.id!,
		holeNumber: model.holeNumber,
		par: model.par,
		courseId: model.courseId,
	}
}
