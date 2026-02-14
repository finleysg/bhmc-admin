"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
	const { user, isAuthenticated, logout } = useAuth()

	if (!isAuthenticated || !user) {
		return (
			<Button
				variant="ghost"
				size="sm"
				className="text-primary-foreground hover:bg-white/10"
				asChild
			>
				<Link href="/sign-in">Login</Link>
			</Button>
		)
	}

	const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					aria-label="Account menu"
					className="relative h-8 w-8 rounded-full hover:bg-white/10"
				>
					<Avatar>
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>
					{user.firstName} {user.lastName}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/member/my-account">
						<User className="mr-2 size-4" />
						My Account
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => void logout()}>
					<LogOut className="mr-2 size-4" />
					Logout
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
