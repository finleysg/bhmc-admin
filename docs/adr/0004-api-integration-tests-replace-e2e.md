# Local API integration tests replace browser end-to-end tests

Status: accepted

We had a Playwright suite (about 70 tests) that drove the public site and the admin app in a browser. Writing tests for it was slow, and every full run had two or three failures, each from a different test. The causes were structural:

- parallel workers shared one dev database and reused the same test users and events
- tests waited on systems that finish on their own schedule: email through Mailpit, Stripe test mode, server-sent events, and the Next.js page cache

We deleted it. Integration coverage now comes from tests that boot the real NestJS `AppModule` and call it over HTTP (supertest), against a disposable `bhmc_test` database built from Django's migrations. The only fakes are the services that leave the process: Django's token check, mail, and Stripe. Each test resets the tables it touches, seeds them with small factories, and asserts on the response and the database rows. Files run one at a time. The suite runs only locally (`pnpm test:integration`), not in `pnpm test` or CI. It refuses to run against any database whose name does not end in `_test`.

The API is the right layer for this test suite. Business rules, permissions, validation, and transactions live there ([admin modernization plan](../admin-modernization-plan.md)), and the admin app, the public site, and the planned CLI are all clients of it. UI behavior is covered by the existing component tests in each app.

## Consequences

- Nothing automated checks that pages, Next.js proxy routes, and API endpoints are wired together. A page calling the wrong route, or a proxy forwarding the wrong path, is caught by hand. We accept this because such breaks are rare and obvious when they happen.
- Business-rule coverage moves into integration tests gradually: a rule gets a test when it is next touched, not through a bulk port of the old suite.
- Code that writes after responding (fire-and-forget) has to be polled for in tests. Treat that as a signal to make the write part of the request when the rule matters.
- Revisit this decision if production bugs start coming from UI-to-API wiring. The fix would then be a small set of serial browser smoke tests, not a return to a broad browser suite.
