import { MemberhipReport } from "../../components/reports/membership-report"
import { AppendTeetimesScreen } from "../screens/append_teetimes"
import { CloneEventsScreen } from "../screens/clone-events"
import { ClubDocumentsScreen } from "../screens/club-documents"
import { EventDocumentsScreen } from "../screens/event-documents"
import { EventReportScreen } from "../screens/event-report"
import { ImportChampionsScreen } from "../screens/import-champions"
import { ImportLeaderboardScreen } from "../screens/import-leaderboard"
import { ImportMajorPointsScreen } from "../screens/import-major-points"
import { ManagePlayersScreen } from "../screens/manage-players"
import { PaymentReportScreen } from "../screens/payment-report"
import { RegistrationNotesScreen } from "../screens/registration-notes"
import { SkinsReportScreen } from "../screens/skins-report"
import { UpdatePortalScreen } from "../screens/update-portal"
import { UploadPhotoScreen } from "../screens/upload-photo"
import { ViewSlotsScreen } from "../screens/view-slots"
import { Admin } from "./admin"
import { AdminMenu } from "./admin-menu"
import { EventAdmin } from "./event-admin"
import { EventAdminMenu } from "./event-admin-menu"

export interface EventAdminHandle {
	title: string
}

export const adminRoutes = () => [
	{
		path: "",
		element: <Admin />,
		children: [
			{ element: <AdminMenu />, index: true },
			{ path: "clone-events", element: <CloneEventsScreen /> },
			{ path: "membership-report", element: <MemberhipReport /> },
			{ path: "upload-photo", element: <UploadPhotoScreen /> },
			{ path: "club-documents", element: <ClubDocumentsScreen /> },
			{
				path: "event/:eventId",
				element: <EventAdmin />,
				children: [
					{ element: <EventAdminMenu />, index: true },
					{ path: "event-report", element: <EventReportScreen /> },
					{ path: "payment-report", element: <PaymentReportScreen /> },
					{ path: "skins-report", element: <SkinsReportScreen /> },
					{ path: "registration-notes", element: <RegistrationNotesScreen /> },
					{ path: "manage-players", element: <ManagePlayersScreen /> },
					{ path: "update-portal", element: <UpdatePortalScreen /> },
					{ path: "manage-documents", element: <EventDocumentsScreen /> },
					{ path: "import-leaderboard", element: <ImportLeaderboardScreen /> },
					{ path: "import-major-points", element: <ImportMajorPointsScreen /> },
					{ path: "import-champions", element: <ImportChampionsScreen /> },
					{ path: "view-slots", element: <ViewSlotsScreen /> },
					{ path: "append-teetime", element: <AppendTeetimesScreen /> },
				],
			},
		],
	},
]
