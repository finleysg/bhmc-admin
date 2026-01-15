import { createContext } from "react"

interface ILayoutContext {
	sidebarOpen: boolean
	closeSidebar?: () => void
	openSidebar?: () => void
	toggleSidebar?: () => void
}

export const LayoutContext = createContext<ILayoutContext>({ sidebarOpen: false })
LayoutContext.displayName = "LayoutContext"
