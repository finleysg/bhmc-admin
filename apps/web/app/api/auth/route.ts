import { toNextJsHandler } from "better-auth/next-js"

import auth from "@/lib/auth"

console.log("Auth index route loaded")

export const { GET, POST } = toNextJsHandler(auth.handler)
