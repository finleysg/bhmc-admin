/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useRoutes } from "react-router-dom"
import { ToastContainer } from "react-toastify"

import { useLayout } from "../hooks/use-layout"
import { Footer } from "./footer"
import { Header } from "./header"
import { mainRoutes } from "./routes"
import { Sidebar } from "./sidebar"

function MainLayout() {
	const { sidebarOpen, closeSidebar } = useLayout()
	// const { user } = useAuth()
	const routing = useRoutes(mainRoutes())
	// const themeColor = user.isAuthenticated ? "dark" : "dark"

	return (
		<main className="main">
			<ToastContainer autoClose={3000} hideProgressBar={true} newestOnTop={true} />
			<Header />
			<Sidebar />
			<section className="content">
				{routing}
				<Footer />
				{sidebarOpen && <div onClick={closeSidebar} className="sidebar-backdrop"></div>}
			</section>
		</main>
	)
}

export default MainLayout
