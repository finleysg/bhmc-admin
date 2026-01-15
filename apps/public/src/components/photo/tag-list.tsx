interface TagProps {
	tag: string
	onRemoveTag?: (tag: string) => void
}

interface TagListProps {
	tags: string[]
	onRemoveTag?: (tag: string) => void
}

function TagInstance({ tag, onRemoveTag: removeTag }: TagProps) {
	const handleRemove = () => {
		if (removeTag) {
			removeTag(tag)
		}
	}
	return (
		<span className="badge text-bg-info" role="term">
			{tag}
			<button
				type="button"
				className="ms-2 btn-close btn-close-white btn-xs"
				onClick={handleRemove}
				aria-label="Remove"
			></button>
		</span>
	)
}

export function TagList({ tags, onRemoveTag: removeTag }: TagListProps) {
	return (
		<ul className="tag-list mb-2 mt-1">
			{tags.map((tag) => (
				<li key={tag}>
					<TagInstance tag={tag} onRemoveTag={removeTag} />
				</li>
			))}
		</ul>
	)
}
