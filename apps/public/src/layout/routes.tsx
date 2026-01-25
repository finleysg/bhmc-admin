import { Navigate } from "react-router-dom"
import { AboutUsScreen } from "../screens/about-us"
import { AdminPaymentCompleteScreen } from "../screens/registration/admin-payment-complete"
import { AdminPaymentFlow } from "../screens/registration/admin-payment-flow"
import { AdminPaymentScreen } from "../screens/registration/admin-payment"
import { CalendarScreen } from "../screens/calendar"
import { ChampionsScreen } from "../screens/champions"
import { ContactScreen } from "../screens/contact"
import { DamCupScreen } from "../screens/dam-cup"
import { DirectoryScreen } from "../screens/directory"
import { EditRegistrationScreen } from "../screens/registration/edit-registration"
import { AddPlayersScreen } from "../screens/registration/add-players"
import { DropPlayersScreen } from "../screens/registration/drop-players"
import {
	ManageRegistrationMenu,
	ManageRegistrationScreen,
} from "../screens/registration/manage-registration"
import { MoveGroupScreen } from "../screens/registration/move-group"
import { ReplacePlayerScreen } from "../screens/registration/replace-player"
import { AddNotesScreen } from "../screens/registration/add-notes"
import { EventDetailScreen } from "../screens/registration/event-detail"
import { EventViewScreen } from "../screens/registration/event-view"
import { GalleryImageScreen } from "../screens/gallery-image"
import { HomeScreen } from "../screens/home"
import { MaintenanceScreen } from "../screens/maintenance"
import { MatchPlayScreen } from "../screens/match-play"
import { NotFoundScreen } from "../screens/not-found"
import { PaymentScreen } from "../screens/registration/payment"
import { PaymentFlow } from "../screens/registration/payment-flow"
import { PhotoGalleryScreen } from "../screens/photo-gallery"
import { PlayerProfileScreen } from "../screens/player-profile"
import { PlayerScoresScreen } from "../screens/account/player-scores"
import { PolicyScreen } from "../screens/policies"
import { RegisterScreen } from "../screens/registration/register"
import { RegisteredScreen } from "../screens/registration/registered"
import { RegistrationCompleteScreen } from "../screens/registration/registration-complete"
import { ReserveScreen } from "../screens/registration/reserve"
import { ReviewRegistrationScreen } from "../screens/registration/review-registration"
import { SeasonLongPointsScreen } from "../screens/season-long-points"
import { SendMessageScreen } from "../screens/send-message"
import * as config from "../utils/app-config"
import { MembershipScreen } from "../screens/membership"
import {
	MemberHub,
	MemberAccountScreen,
	MemberFriendsScreen,
	MemberResultsScreen,
	MemberScoresScreen,
} from "../screens/member/member-routes"
import { Member } from "../screens/member/member"

export const mainRoutes = () =>
	config.maintenanceMode
		? [{ path: "*", element: <MaintenanceScreen /> }]
		: [
				{ path: "/", element: <HomeScreen /> },
				{ path: "/home", element: <HomeScreen /> },
				{ path: "/membership", element: <MembershipScreen /> },
				{ path: "/calendar/:year/:monthName", element: <CalendarScreen /> },
				{
					path: "/event/:eventDate/:eventName",
					element: <EventDetailScreen />,
					children: [
						{ element: <EventViewScreen />, index: true },
						{ path: "reserve", element: <ReserveScreen /> },
						{ path: "register", element: <RegisterScreen /> },
						{ path: "edit", element: <EditRegistrationScreen /> },
						{
							path: "manage",
							element: <ManageRegistrationScreen />,
							children: [
								{ index: true, element: <ManageRegistrationMenu /> },
								{ path: "add", element: <AddPlayersScreen /> },
								{ path: "drop", element: <DropPlayersScreen /> },
								{ path: "move", element: <MoveGroupScreen /> },
								{ path: "replace", element: <ReplacePlayerScreen /> },
								{ path: "notes", element: <AddNotesScreen /> },
							],
						},
						{ path: "review", element: <ReviewRegistrationScreen /> },
						{
							path: ":paymentId",
							element: <PaymentFlow />,
							children: [
								{ path: "payment", element: <PaymentScreen /> },
								{ path: "complete", element: <RegistrationCompleteScreen /> },
							],
						},
						{ path: "registrations", element: <RegisteredScreen /> },
					],
				},
				{ path: "/champions/:season", element: <ChampionsScreen /> },
				{ path: "/my-scores", element: <PlayerScoresScreen /> },
				{ path: "/my-scores/*", element: <Navigate to="/my-scores" replace /> },
				{ path: "/policies/:policyType", element: <PolicyScreen /> },
				{ path: "/match-play", element: <MatchPlayScreen /> },
				{ path: "/season-long-points", element: <SeasonLongPointsScreen /> },
				{ path: "/dam-cup", element: <DamCupScreen /> },
				{ path: "/directory", element: <DirectoryScreen /> },
				{ path: "/directory/:playerId", element: <PlayerProfileScreen /> },
				{ path: "/contact-us", element: <ContactScreen /> },
				{ path: "/contact-us/message", element: <SendMessageScreen /> },
				{ path: "/about-us", element: <AboutUsScreen /> },
				{ path: "/gallery", element: <PhotoGalleryScreen /> },
				{ path: "/gallery/:id", element: <GalleryImageScreen /> },
				{ path: "/my-account", element: <Navigate to="/member/account" replace /> },
				{ path: "/my-activity", element: <Navigate to="/member/friends" replace /> },
				{
					path: "/member",
					element: <Member />,
					children: [
						{ index: true, element: <MemberHub /> },
						{ path: "account", element: <MemberAccountScreen /> },
						{ path: "friends", element: <MemberFriendsScreen /> },
						{ path: "scores", element: <MemberScoresScreen /> },
						{ path: "scores/*", element: <Navigate to="/member/scores" replace /> },
						{ path: "results", element: <MemberResultsScreen /> },
					],
				},
				{
					path: "/registration/:registrationId/payment/:paymentId",
					element: <AdminPaymentFlow />,
					children: [
						{ index: true, element: <AdminPaymentScreen /> },
						{ path: "complete", element: <AdminPaymentCompleteScreen /> },
					],
				},
				{ path: "*", element: <NotFoundScreen /> },
			]
