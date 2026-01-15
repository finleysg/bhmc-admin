import { useEventListener } from "usehooks-ts"
import { isExtraLarge } from "../styles/media-queries"
import { PropsWithChildren, useCallback, useState } from "react"
import { LayoutContext } from "./layout-context"

export function LayoutProvider(props: PropsWithChildren) {
	const [sidebarOpen, setSidebarOpen] = useState(!!isExtraLarge())

	const resizeHandler = useCallback((event: Event) => {
		const eventTarget = event.target as Window
		if (eventTarget?.innerWidth >= 1200) {
			setSidebarOpen(true)
		}
	}, [])

	useEventListener("resize", resizeHandler)

	const closeSidebar = () => {
		if (!isExtraLarge()) {
			setSidebarOpen(false)
		}
	}

	const openSidebar = () => {
		setSidebarOpen(true)
	}

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen)
	}

	const value = {
		sidebarOpen,
		closeSidebar,
		openSidebar,
		toggleSidebar,
	}

	return <LayoutContext.Provider value={value} {...props} />
}
