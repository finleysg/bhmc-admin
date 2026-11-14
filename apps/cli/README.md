# bhmc CLI

A command-line client for the BHMC admin API, for agents acting on an operator's behalf ([admin modernization plan](../../docs/admin-modernization-plan.md)). It authenticates as the operator, and every change it makes is recorded in the audit history as coming from the CLI.

## Usage

```bash
pnpm -s bhmc login            # prompts for email and password; stores the token
pnpm -s bhmc whoami           # the logged-in user and their admin roles
pnpm -s bhmc logout           # revokes the token with Django and forgets it
```

Use `-s` (silent) so pnpm's own banner doesn't mix with the JSON output.

| Variable           | Default                           | Purpose                             |
| ------------------ | --------------------------------- | ----------------------------------- |
| `BHMC_API_URL`     | `http://localhost:3333`           | NestJS admin API                    |
| `BHMC_DJANGO_URL`  | `http://localhost:8000`           | Django, for login and logout        |
| `BHMC_CREDENTIALS` | `~/.config/bhmc/credentials.json` | Token file (owner-only permissions) |

Tokens are stored per API URL, so a local login and a production login don't interfere.

## Conventions for commands

- **Output is JSON.** A command prints its result as JSON on stdout. A failure prints `{ "error": { "message", "status" } }` on stderr and exits with code 1. Prompts go to stderr.
- **Commands call the NestJS API**, not Django or the database. Business rules, permissions, and auditing live there. `ApiClient` sends the operator's token and `X-Admin-Client: cli`.
- **Changes are dry runs unless `--apply` is given.** A command that changes data prints a preview of exactly what it would do and changes nothing. With `--apply` it makes the change and prints the result. The API endpoint behind it should support the preview, so the preview and the real run share one code path.
- **One command per operation**, named for what it does (`readiness`, `inspect registration`, `season roll-forward`, `fees change`). Add the command to `src/index.ts` and its logic to a testable function that takes a `CommandContext`.
