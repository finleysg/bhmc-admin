import { setupServer } from "msw/node"

import { eventRegistrationHandlers } from "./handlers/event-registration-handlers"
import { dataHandlers } from "./handlers/misc-handlers"
import { playerHandlers } from "./handlers/player-handlers"
import { authHandlers } from "./handlers/user-handlers"

const server = setupServer(
	...authHandlers,
	...playerHandlers,
	...dataHandlers,
	...eventRegistrationHandlers,
)

export * from "msw"
export { server }
