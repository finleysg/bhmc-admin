import { useLayout } from "../hooks/use-layout"

function NavigationTrigger() {
	const { sidebarOpen, toggleSidebar } = useLayout()

	const triggerClass = () => {
		return `navigation-trigger hidden-xl-up ${sidebarOpen ? "toggled" : ""}`
	}

	return (
		<div
			className={triggerClass()}
			role="menu"
			tabIndex={0}
			onKeyDown={toggleSidebar}
			onClick={toggleSidebar}
		>
			<div className="navigation-trigger__inner">
				<i className="navigation-trigger__line"></i>
				<i className="navigation-trigger__line"></i>
				<i className="navigation-trigger__line"></i>
			</div>
		</div>
	)
}

export { NavigationTrigger }
