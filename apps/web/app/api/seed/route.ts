import { NextRequest, NextResponse } from "next/server"

import { auth } from "../../../lib/auth"

export async function POST(_req: NextRequest) {
	try {
		const res = await auth.api.createUser({
			body: {
				email: "finleysg@gmail.com",
				password: "sverige8",
				name: "Stuart Finley",
				role: "admin",
			},
		})
		console.log("Created admin user")
		console.log(res)
	} catch (error) {
		console.log("Failed to create admin user: " + error.toString())
	}
	return NextResponse.json({ status: "ok" })
}
