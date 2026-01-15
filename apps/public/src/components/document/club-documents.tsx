import { ClubDocument } from "./club-document"

export function ClubDocumentsCard({ codes, title }: { codes: string[]; title?: string }) {
	return (
		<div className="card mb-4">
			<div className="card-body">
				<h4 className="card-header">{title ?? "Club Documents"}</h4>
				{codes.map((code) => (
					<ClubDocument key={code} code={code} />
				))}
			</div>
		</div>
	)
}
