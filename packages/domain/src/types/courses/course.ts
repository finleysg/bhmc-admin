import { Hole } from "./hole"
import { Tee } from "./tee"

export interface Course {
	id: number
	name: string
	numberOfHoles: number
	ggId?: string | null
	tees?: Tee[]
	holes?: Hole[]
}
