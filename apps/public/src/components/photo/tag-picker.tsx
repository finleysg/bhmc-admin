import { ChangeEvent, useState } from "react"

import { useTags } from "../../hooks/use-tags"
import { Tag } from "../../models/tag"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { TagList } from "./tag-list"

interface TagPickerProps {
	defaultTags: string[]
	error?: string
	onChange: (tags: Tag[]) => void
}

function TagPicker({ defaultTags, error, onChange }: TagPickerProps) {
	const [selectedOption, setSelectedOption] = useState(0)
	const [tagList, updateTagList] = useState(defaultTags)
	const { data, status } = useTags()
	const tags =
		data?.map((t) => {
			return {
				id: t.id,
				label: t.tag,
			}
		}) ?? []

	const publishTagChanges = () => {
		const tags = data?.filter((t) => tagList.indexOf(t.tag) >= 0)
		onChange(tags ?? [])
	}

	const handleRemoveTag = (tagName: string) => {
		const idx = tagList.findIndex((t) => t === tagName)
		if (idx >= 0) {
			const updatedTags = tagList.slice(0)
			updatedTags.splice(idx, 1)
			updateTagList(updatedTags)
			publishTagChanges()
		}
	}

	const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
		if (data) {
			const tag = data.find((t) => t.id === +e.target.value)
			if (tag) {
				tagList.push(tag.tag)
				updateTagList(tagList)
				publishTagChanges()
				setTimeout(() => setSelectedOption(0), 500)
			}
		}
	}

	return (
		<div>
			<div className={"form-group"}>
				<OverlaySpinner loading={status === "pending"} />
				<label htmlFor="tag-picker">Tags</label>
				<select
					id="tag-picker"
					value={selectedOption}
					onChange={handleSelect}
					onSelect={handleSelect}
					className="form-control"
					aria-invalid={Boolean(error)}
				>
					<option key={0} value={""}>
						-- Select --
					</option>
					{tags.map((opt) => {
						return (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						)
					})}
				</select>
				<i className="form-group__bar"></i>
				{error && (
					<div className="invalid-feedback" aria-errormessage={error}>
						{error}
					</div>
				)}
			</div>
			<TagList tags={tagList} onRemoveTag={handleRemoveTag} />
		</div>
	)
}

export { TagPicker }
