import { useRandomPhotos } from "../../hooks/use-random-photos"
import { SmallPhoto } from "./small-photo"

interface RandomPicListProps {
	take: number
	tag?: string
}

export function RandomPicList({ tag, take }: RandomPicListProps) {
	const { data } = useRandomPhotos(take, tag)

	return (
		<div className="random-photo">
			{data?.map((pic) => (
				<li key={pic.id}>
					<SmallPhoto photo={pic} />
					<p className="text-muted">
						{pic.caption} (<strong>{pic.year}</strong>)
					</p>
				</li>
			))}
		</div>
	)
}
