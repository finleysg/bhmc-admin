import { CardContent } from "../components/card/content"
import { RandomPicList } from "../components/photo/random-pic-list"

export function AboutUsScreen() {
	return (
		<div className="content__inner">
			<div className="row">
				<div className="col-md-6 col-12">
					<CardContent contentKey="about-us" />
				</div>
				<div className="col-md-6 col-12">
					<div className="card">
						<div className="card-body">
							<h4 className="card-title text-success">Serious Golf, Serious Fun</h4>
							<RandomPicList take={3} />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
