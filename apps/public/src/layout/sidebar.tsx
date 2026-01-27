import React from "react"

import { BiEnvelope, BiLogInCircle } from "react-icons/bi"
import { GiGolfFlag, GiLaurelsTrophy, GiTrophyCup } from "react-icons/gi"
import { GoCalendar, GoHome, GoInfo, GoPlus, GoQuestion } from "react-icons/go"
import { MdAccountCircle, MdPeopleOutline, MdPersonAdd } from "react-icons/md"
import { PiPencilLine } from "react-icons/pi"
import { RiGalleryFill } from "react-icons/ri"
import { TiContacts } from "react-icons/ti"

import { useLayout } from "../hooks/use-layout"
import { useMyGroups } from "../hooks/use-my-groups"
import { useSelectedMonth } from "../hooks/use-selected-month"
import { Groups } from "../models/codes"
import { currentSeason } from "../utils/app-config"
import { MenuItem } from "./menu-item"

export function Sidebar() {
	const { sidebarOpen } = useLayout()
	const groups = useMyGroups()
	const { year, monthName } = useSelectedMonth()

	return (
		<aside className={sidebarOpen ? "sidebar sidebar--bg toggled" : "sidebar sidebar--bg"}>
			<ul className="navigation">
				<MenuItem path="home" icon={<GoHome />} name="Home" />
				{(groups.indexOf(Groups.Administrators) >= 0 ||
					groups.indexOf(Groups.TournamentAdmins) >= 0) && (
					<MenuItem path="admin" icon={<PiPencilLine />} name="Administration" />
				)}
				<MenuItem path="membership" icon={<GoPlus />} name={`${currentSeason} Signup Page`} />
				<MenuItem
					path={`calendar/${year}/${monthName.toLowerCase()}`}
					icon={<GoCalendar />}
					name="Event Calendar"
				/>
				<MenuItem path={`champions/${currentSeason}`} icon={<GiLaurelsTrophy />} name="Champions" />
				{groups.indexOf(Groups.AuthenticatedUsers) >= 0 && (
					<MenuItem path="member" icon={<MdAccountCircle />} name="My Pages" />
				)}
				<MenuItem path="policies/policies-and-procedures" icon={<GoInfo />} name="Policies" />
				<MenuItem path="match-play" icon={<MdPeopleOutline />} name="Match Play" />
				<MenuItem path="season-long-points" icon={<GiGolfFlag />} name="Season Long Points" />
				<MenuItem path="dam-cup" icon={<GiTrophyCup />} name="Dam Cup" />
				{groups.indexOf(Groups.AuthenticatedUsers) >= 0 && (
					<MenuItem path="directory" icon={<TiContacts />} name="Account Directory" />
				)}
				<MenuItem path="contact-us" icon={<BiEnvelope />} name="Contact Us" />
				<MenuItem path="about-us" icon={<GoQuestion />} name="About Us" />
				<MenuItem path="gallery" icon={<RiGalleryFill />} name="Photo Gallery" />
				{groups.indexOf(Groups.Guests) >= 0 && (
					<React.Fragment>
						<MenuItem path="/session/login" icon={<BiLogInCircle />} name="Login" />
						<MenuItem path="/session/account" icon={<MdPersonAdd />} name="Create an Account" />
					</React.Fragment>
				)}
				{groups.indexOf(Groups.PaulHelpers) >= 0 && (
					<li>
						<a
							href="https://docs.google.com/spreadsheets/d/1d0DyeELbWPKCX8kHqi0gdBsRVx83HZMm-LiBhBSBw-w/edit?usp=sharing"
							target="_blank"
							rel="noreferrer"
						>
							Paul&apos;s Schedule
						</a>
					</li>
				)}
			</ul>
		</aside>
	)
}
