import { Hole } from "./hole"
import { Tee } from "./tee"

export interface Course {
	id: number
	name: string
	numberOfHoles: number
	ggId?: string | null
	color?: string | null
	tees?: Tee[]
	holes?: Hole[]
}
