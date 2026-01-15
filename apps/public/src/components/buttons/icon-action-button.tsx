import { ComponentPropsWithoutRef, PropsWithChildren } from "react"

export interface ActionButtonProps extends ComponentPropsWithoutRef<"button"> {
	label: string
}

export function IconActionButton({
	label,
	children,
	...rest
}: PropsWithChildren<ActionButtonProps>) {
	return (
		<button className="action-button" title={label} {...rest}>
			{children}
		</button>
	)
}
