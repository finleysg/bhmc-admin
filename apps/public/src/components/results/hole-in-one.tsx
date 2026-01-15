import { format } from "date-fns"
import ReactMarkdown from "react-markdown"
import { Link } from "react-router-dom"
import remarkGfm from "remark-gfm"

import { useAces } from "../../hooks/use-aces"
import { useAuth } from "../../hooks/use-auth"
import { usePageContent } from "../../hooks/use-page-content"
import { Ace } from "../../models/ace"
import { currentSeason } from "../../utils/app-config"
import { OverlaySpinner } from "../spinners/overlay-spinner"

interface AcesProps {
	aces?: Ace[]
}

interface AceProps {
	ace: Ace
}

export function HoleInOneCard() {
	const {
		data: pageContent,
		status: pcStatus,
		fetchStatus: pcFetchStatus,
	} = usePageContent("hole-in-one")
	const { data: aces, status, fetchStatus } = useAces(currentSeason)

	const isLoading =
		pcStatus === "pending" ||
		pcFetchStatus === "fetching" ||
		status === "pending" ||
		fetchStatus === "fetching"

	return (
		<div className="card mb-4">
			<div className="card-body">
				<OverlaySpinner loading={isLoading} />
				<h4 className="card-header mb-2">{pageContent?.title ?? "loading..."}</h4>
				<ReactMarkdown remarkPlugins={[remarkGfm]}>{pageContent?.content}</ReactMarkdown>
				<HoleInOneList aces={aces} />
			</div>
		</div>
	)
}

function HoleInOneList({ aces }: AcesProps) {
	if (!aces || aces.length === 0) {
		return (
			<p className="text-primary">
				No great shots yet for this season. <small>(It only takes one good swing!)</small>
			</p>
		)
	}

	return aces.map((ace: Ace) => (
		<div key={ace.id} className="p-1">
			<HoleInOneRow ace={ace} />
		</div>
	))
}

function HoleInOneRow({ ace }: AceProps) {
	const { user } = useAuth()
	const { player, hole, shotDate } = ace

	return (
		<div className="d-flex">
			<div className="me-4">{format(shotDate, "yyyy-MM-dd")}</div>
			<div className="flex-grow-1">
				{user.isAuthenticated ? (
					<Link to={`/directory/${player.id}`}>{player.name}</Link>
				) : (
					<span>{player.name}</span>
				)}
			</div>
			<div>{hole}</div>
		</div>
	)
}
