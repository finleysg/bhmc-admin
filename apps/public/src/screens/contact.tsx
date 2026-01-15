import { Link } from "react-router-dom"

import { CardContent } from "../components/card/content"
import { Board, Officers } from "../components/directory/board"

export function ContactScreen() {
	return (
		<div className="content__inner">
			<header className="content__title">
				<Link to="message" className="btn btn-sm btn-primary">
					Send Us a Message
				</Link>
			</header>
			<div className="row">
				<div className="col-lg-3 col-md-6 col-12">
					<CardContent contentKey="contact-officers">
						<Officers />
					</CardContent>
				</div>
				<div className="col-lg-3 col-md-6 col-12">
					<CardContent contentKey="contact-directors">
						<Board />
					</CardContent>
				</div>
				<div className="col-lg-3 col-md-6 col-12">
					<CardContent contentKey="contact-committees" />
				</div>
				<div className="col-lg-3 col-md-6 col-12">
					<CardContent contentKey="contact-staff" />
				</div>
			</div>
		</div>
	)
}
