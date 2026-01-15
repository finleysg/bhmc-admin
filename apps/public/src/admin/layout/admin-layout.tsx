import { useRoutes } from "react-router-dom"
import { ToastContainer } from "react-toastify"

import { Footer } from "../../layout/footer"
import { Header } from "../../layout/header"
import { adminRoutes } from "./admin-routes"

function AdminLayout() {
	const routing = useRoutes(adminRoutes())

	return (
		<main className="main">
			<ToastContainer autoClose={3000} hideProgressBar={true} newestOnTop={true} />
			<Header />
			<section className="admin-content">
				{routing}
				<Footer />
			</section>
		</main>
	)
}

export default AdminLayout
