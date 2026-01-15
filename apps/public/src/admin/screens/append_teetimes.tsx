import { toast } from "react-toastify"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ErrorDisplay } from "../../components/feedback/error-display"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { httpClient } from "../../utils/api-client"
import { apiUrl } from "../../utils/api-utils"
import { useEventAdmin } from "../layout/event-admin"

export function AppendTeetimesScreen() {
	const { clubEvent } = useEventAdmin()
	const queryClient = useQueryClient()
	const {
		mutateAsync: append,
		error,
		status,
	} = useMutation({
		mutationFn: ({ eventId }: { eventId: number }) => {
			return httpClient(apiUrl(`events/${eventId}/append_teetime/`), {
				method: "PUT",
			})
		},
		onSuccess: (_, { eventId }) => {
			queryClient.invalidateQueries({ queryKey: ["event-registration-slots", eventId] })
			queryClient.invalidateQueries({ queryKey: ["club-events", eventId] })
		},
	})

	const handleAppend = async () => {
		await append({ eventId: clubEvent.id })
		toast.success("An additional teetime has been added to each course.")
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12">
				<div className="card">
					<div className="card-body">
						<OverlaySpinner loading={status === "pending"} />
						<h4 className="card-header mb-2">Add a Teetime</h4>
						<p>Add an additional teetime to each course for this event.</p>
						<button className="btn btn-primary" onClick={handleAppend}>
							Add Teetime
						</button>
						{error && <ErrorDisplay error={error.message} delay={3000} onClose={() => void 0} />}
					</div>
				</div>
			</div>
		</div>
	)
}
