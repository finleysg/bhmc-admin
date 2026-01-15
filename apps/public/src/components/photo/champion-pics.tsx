import { usePhotos } from "../../hooks/use-photo"
import { SmallPhoto } from "./small-photo"

interface ChampionPicsProps {
	season: number
	eventName: string
}

export function ChampionPics({ season, eventName }: ChampionPicsProps) {
	const { data } = usePhotos(season, ["champion", eventName])

	return (
		<>
			{data?.map((pic) => (
				<div key={pic.id}>
					<SmallPhoto photo={pic} />
					<p className="text-muted">
						{pic.caption} (<strong>{pic.year}</strong>)
					</p>
				</div>
			))}
		</>
	)
}
