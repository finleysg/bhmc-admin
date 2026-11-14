# API integration tests

Local-only tests that boot the real NestJS `AppModule` against a real MySQL database (`bhmc_test`) and call it over HTTP. They are not part of `pnpm test` or CI.

## Running

```bash
docker compose up -d mysql backend          # the stack must be running
pnpm --filter api test:integration:setup    # once, and after new Django migrations
pnpm test:integration
```

`setup-db.sh` creates `bhmc_test` and builds its schema from Django's migrations, so it always matches production. The suite refuses to run against a database whose name does not end in `_test`. Override the connection with `INTEGRATION_DATABASE_URL`.

## Writing a test

- Name files `*.int.test.ts`. Files run one at a time.
- `createTestApp()` boots the app. Only the Django token check, `MailService`, and `StripeService` are replaced. `t.http(user).post(url)` sends a request as `user`. `t.mail` and `t.stripe` are auto-mocks: every method is a `jest.fn()` you can assert on.
- Call `resetDb()` in `beforeEach` (or `beforeAll` for read-only suites). It truncates the tables in `RESET_TABLES` (`support/db.ts`). Add a table there when your test, or the code it calls, writes to it.
- Seed with the factories in `support/factories.ts` (`createUser({ roles })`, `createEvent()`, `createRegistration()`). Add factories as you need them, and give them the minimum the API requires.
- Assert on the response and on database rows (`testDb()`), not on internal calls.
- If code writes after responding (fire-and-forget), poll briefly rather than sleeping.
