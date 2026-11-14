import type { AdminSettingView } from "@repo/domain/types"

import { Card, CardContent, CardFooter } from "@/components/shadcn/card"
import { apiGet } from "@/lib/server-api"

import { SettingForm } from "./components/setting-form"

/** Stored timestamps are UTC; show them in the club's time zone. */
function formatUpdatedAt(updatedAt: string): string {
	return new Date(`${updatedAt.replace(" ", "T")}Z`).toLocaleString("en-US", {
		timeZone: "America/Chicago",
		dateStyle: "medium",
		timeStyle: "short",
	})
}

function History({ setting }: { setting: AdminSettingView }) {
	const unit = setting.unit ? ` ${setting.unit}` : ""
	if (!setting.updatedAt) {
		return <>Using the default ({setting.defaultValue + unit}).</>
	}
	return (
		<>
			Changed by {setting.updatedBy} on {formatUpdatedAt(setting.updatedAt)}. Default is{" "}
			{setting.defaultValue + unit}.
		</>
	)
}

export default async function SettingsPage() {
	const settings = await apiGet<AdminSettingView[]>("/settings")

	return (
		<div className="mx-auto max-w-3xl space-y-6 md:py-8">
			<div className="space-y-1">
				<h2 className="font-heading text-2xl font-bold">Settings</h2>
				<p className="text-muted-foreground">
					Operational values for alerts and checks. Every change is recorded in the audit history.
				</p>
			</div>
			{settings.map((setting) => (
				<Card key={setting.key}>
					<CardContent>
						<SettingForm setting={setting} />
					</CardContent>
					<CardFooter className="text-sm text-muted-foreground">
						<History setting={setting} />
					</CardFooter>
				</Card>
			))}
		</div>
	)
}
