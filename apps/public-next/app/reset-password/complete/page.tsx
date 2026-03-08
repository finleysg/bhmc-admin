import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ResetPasswordCompletePage() {
	return (
		<div className="mx-auto max-w-sm space-y-6 pt-8">
			<div className="space-y-4 text-center">
				<h1 className="text-2xl font-bold">Password Reset Complete</h1>
				<p className="text-sm text-muted-foreground">
					Your password has been updated. You can now sign in with your new password.
				</p>
				<Button asChild className="w-full">
					<Link href="/sign-in">Sign In</Link>
				</Button>
			</div>
		</div>
	)
}
