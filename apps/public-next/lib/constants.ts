import { getYear } from "date-fns"

export const currentSeason = getYear(Date.now())
