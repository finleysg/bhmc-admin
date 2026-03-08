import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlayerSearch } from "./components/player-search"

export default function DirectoryPage() {
	return (
		<div className="max-w-2xl">
			<Card>
				<CardHeader>
					<CardTitle className="text-primary">Member Directory</CardTitle>
				</CardHeader>
				<CardContent>
					<PlayerSearch />
				</CardContent>
			</Card>
		</div>
	)
}
