import { ContactUsHandler } from "../forms/contact-us-handler"

export function SendMessageScreen() {
	return (
		<div className="content__inner">
			<div className="row">
				<div className="col-lg-6 col-md-8 col-sm-10 col-12">
					<div className="card">
						<div className="card-body">
							<h4 className="card-header mb-2">Send Us a Message</h4>
							<div className="card-text">
								<p>
									Messages are delivered to the four club officers: president, vice-president,
									secretary, and treasurer. We try to respond promptly, but please be patient if
									no-one gets back to you right away.
								</p>
								<ContactUsHandler />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
