import { redirect } from "next/navigation"
import { currentSeason } from "@/lib/constants"

export default function ChampionsRedirect() {
	redirect(`/champions/${currentSeason}`)
}
