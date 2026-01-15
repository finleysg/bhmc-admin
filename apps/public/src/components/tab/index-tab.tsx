import { ComponentPropsWithoutRef, PropsWithChildren } from "react"

interface IndexTabProps extends PropsWithChildren<
	Omit<ComponentPropsWithoutRef<"li">, "onSelect">
> {
	index: number
	selectedIndex: number
	onSelect: (index: number) => void
}

export function IndexTab({ index, selectedIndex, onSelect, children, ...rest }: IndexTabProps) {
	const handleSelect = () => {
		if (index !== selectedIndex) {
			onSelect(index)
		}
	}

	return (
		<li className="nav-item" {...rest}>
			<div
				tabIndex={index}
				onClick={handleSelect}
				onKeyDown={handleSelect}
				className={index === selectedIndex ? "nav-link active" : "nav-link"}
				role="tab"
				aria-selected={index === selectedIndex}
				style={{ cursor: "pointer" }}
			>
				{children}
			</div>
		</li>
	)
}
