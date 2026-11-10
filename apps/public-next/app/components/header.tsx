"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Logo } from "./logo"
import { TextSizeControl } from "./text-size-control"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"
import { SidebarNav } from "./sidebar"

export function Header() {
	const [open, setOpen] = useState(false)

	return (
		<header className="sticky top-0 z-40 border-b bg-header text-header-foreground">
			<div className="flex min-h-14 flex-wrap items-center py-2 gap-4 px-4 lg:px-6">
				<Button
					variant="ghost"
					size="icon"
					className="text-header-foreground hover:bg-white/10 lg:hidden"
					onClick={() => setOpen(true)}
					aria-label="Open menu"
				>
					<Menu className="size-5" />
				</Button>

				<div className="hidden lg:block">
					<Logo />
				</div>
				<div className="lg:hidden">
					<Logo compact />
				</div>

				<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
					<TextSizeControl />
					<ThemeToggle />
					<UserMenu />
				</div>
			</div>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="left" className="w-60 p-0">
					<SheetTitle className="sr-only">Navigation</SheetTitle>
					<div className="pt-12" onClick={() => setOpen(false)}>
						<SidebarNav />
					</div>
				</SheetContent>
			</Sheet>
		</header>
	)
}
