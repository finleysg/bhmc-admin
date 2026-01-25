"use client"

import type { Tag } from "@repo/domain/types"

interface TagSelectProps {
	tags: Tag[]
	selectedTagIds: number[]
	onChange: (selectedTagIds: number[]) => void
	error: string | null
}

export function TagSelect({ tags, selectedTagIds, onChange, error }: TagSelectProps) {
	const handleToggle = (tagId: number) => {
		if (selectedTagIds.includes(tagId)) {
			onChange(selectedTagIds.filter((id) => id !== tagId))
		} else {
			onChange([...selectedTagIds, tagId])
		}
	}

	return (
		<div className="form-control">
			<label className="label">
				<span className="label-text">Tags</span>
			</label>
			<div className="flex flex-wrap gap-3">
				{tags.map((tag) => (
					<label key={tag.id} className="label cursor-pointer gap-2">
						<input
							type="checkbox"
							className="checkbox checkbox-primary"
							checked={selectedTagIds.includes(tag.id)}
							onChange={() => handleToggle(tag.id)}
						/>
						<span className="label-text">{tag.name}</span>
					</label>
				))}
			</div>
			{error && <p className="text-error text-sm mt-1">{error}</p>}
		</div>
	)
}
