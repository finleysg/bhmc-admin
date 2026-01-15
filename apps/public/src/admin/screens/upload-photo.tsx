import { PhotoUploader } from "../../components/photo/photo-uploader"
import { currentSeason } from "../../utils/app-config"

export function UploadPhotoScreen() {
	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12">
				<PhotoUploader season={currentSeason} defaultTags={[]} />
			</div>
		</div>
	)
}
