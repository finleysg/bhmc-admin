"use client"

import { useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProfilePhotoPickerProps {
	onSelect: (file: File) => void
	onClose: () => void
}

export function ProfilePhotoPicker({ onSelect, onClose }: ProfilePhotoPickerProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			onSelect(file)
		}
	}

	return (
		<div className="flex flex-col items-center gap-3">
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleChange}
			/>
			<Button variant="outline" onClick={() => inputRef.current?.click()}>
				<Upload className="mr-2 size-4" />
				Choose Photo
			</Button>
			<Button variant="ghost" size="sm" onClick={onClose}>
				<X className="mr-1 size-4" />
				Cancel
			</Button>
		</div>
	)
}
