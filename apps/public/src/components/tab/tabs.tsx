import { PropsWithChildren } from "react"

export function Tabs({ children }: PropsWithChildren) {
	return (
		<ul className="nav nav-tabs" role="tablist">
			{children}
		</ul>
	)
}
