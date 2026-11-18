# bhmc CLI

A command-line client for the BHMC admin API, for agents acting on an operator's behalf ([admin modernization plan](../../docs/admin-modernization-plan.md)). It authenticates as the operator, and every change it makes is recorded in the audit history as coming from the CLI.

## Usage

```bash
pnpm -s bhmc login            # prompts for email and password; stores the token
pnpm -s bhmc whoami           # the logged-in user and their admin roles
pnpm -s bhmc logout           # revokes the token with Django and forgets it

pnpm -s bhmc readiness --event 742          # Ready to Open Registration findings for one event
pnpm -s bhmc readiness --season 2027        # red/yellow/green summary of every event in a season
pnpm -s bhmc readiness dismiss 742 fee-differs 3 [--apply]   # accept a warning (dry run without --apply)
pnpm -s bhmc readiness restore 742 fee-differs 3 [--apply]   # bring a dismissed warning back
pnpm -s bhmc season roll-forward --from 2026 [--to 2027] [--drop 720,715] [--date 667=2027-01-16] [--name 667="2027 Season Registration"] [--apply]
                                              # next season's events from 2026's (dry run lists each event's issues)
pnpm -s bhmc fees change --season 2027 --fee-type "Cart Fee" --from 14 --to 15 [--event-type N] [--apply]
                                              # every Cart Fee amount of $14 becomes $15 (events with registrations are left unchanged)
pnpm -s bhmc inspect registration --event 742 [--player smith]  # the event's registrations, or a player's (name, GHIN, or email)
pnpm -s bhmc inspect registration 51234 --event 742              # one registration: slots, fees, payments, live Stripe check, change log
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
