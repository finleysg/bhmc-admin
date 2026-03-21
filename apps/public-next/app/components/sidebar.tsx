"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
	CalendarDays,
	Trophy,
	FileText,
	Swords,
	BarChart3,
	Flag,
	Mail,
	Info,
	Images,
	Home,
	Users,
	UserCircle,
	LogIn,
	UserPlus,
	Shield,
	UserCheck,
	CalendarClock,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface NavItem {
	label: string
	href: string
	icon: React.ReactNode
}

const publicLinks: NavItem[] = [
	{ label: "Home", href: "/", icon: <Home className="size-4" /> },
	{ label: "Calendar", href: "/calendar", icon: <CalendarDays className="size-4" /> },
	{ label: "Champions", href: "/champions", icon: <Trophy className="size-4" /> },
	{ label: "Policies", href: "/policies", icon: <FileText className="size-4" /> },
	{ label: "Match Play", href: "/match-play", icon: <Swords className="size-4" /> },
	{ label: "Points", href: "/points", icon: <BarChart3 className="size-4" /> },
	{ label: "Dam Cup", href: "/dam-cup", icon: <Flag className="size-4" /> },
	{ label: "Contact Us", href: "/contact", icon: <Mail className="size-4" /> },
	{ label: "Membership", href: "/membership", icon: <UserCheck className="size-4" /> },
	{ label: "About Us", href: "/about", icon: <Info className="size-4" /> },
	{ label: "Gallery", href: "/gallery", icon: <Images className="size-4" /> },
]

const memberLinks: NavItem[] = [
	{ label: "My Pages", href: "/member", icon: <UserCircle className="size-4" /> },
	{ label: "Directory", href: "/member/directory", icon: <Users className="size-4" /> },
]

const guestLinks: NavItem[] = [
	{ label: "Login", href: "/sign-in", icon: <LogIn className="size-4" /> },
	{ label: "Create Account", href: "/sign-up", icon: <UserPlus className="size-4" /> },
]

function NavLink({ item }: { item: NavItem }) {
	const pathname = usePathname()
	const active = item.href === "/" ? pathname === "/" : pathname === item.href

	return (
		<Link
			href={item.href}
			className={cn(
				"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
				active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
			)}
		>
			{item.icon}
			{item.label}
		</Link>
	)
}

export function SidebarNav() {
	const { isAuthenticated, isAdmin } = useAuth()

	return (
		<nav className="flex flex-col gap-1 p-2">
			{publicLinks.map((item) => (
				<NavLink key={item.href} item={item} />
			))}

			<Separator className="my-2" />

			{isAuthenticated ? (
				<>
					{memberLinks.map((item) => (
						<NavLink key={item.href} item={item} />
					))}
				</>
			) : (
				<>
					{guestLinks.map((item) => (
						<NavLink key={item.href} item={item} />
					))}
				</>
			)}

			{isAdmin && (
				<>
					<Separator className="my-2" />
					<a
						href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin"}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
					>
						<Shield className="size-4" />
						Administration
					</a>
					<a
						href="https://docs.google.com/spreadsheets/d/1d0DyeELbWPKCX8kHqi0gdBsRVx83HZMm-LiBhBSBw-w/edit?usp=sharing"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
					>
						<CalendarClock className="size-4" />
						Paul&#39;s Schedule
					</a>
				</>
			)}
		</nav>
	)
}

export function Sidebar() {
	return (
		<aside className="hidden w-60 shrink-0 border-r bg-background lg:block">
			<SidebarNav />
		</aside>
	)
}
