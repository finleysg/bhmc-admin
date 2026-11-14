# Django keeps schema ownership and auth during the admin modernization

Status: accepted

We are replacing Django admin with the NestJS API, the Next.js admin, and a CLI. Retiring Django is a separate, later project. Until then Django still owns the MySQL schema and authentication. New tables the modernization needs (the admin audit record, settings, readiness dismissals, checklist confirmations) are added through Django migrations, and NestJS keeps reading them through Drizzle without migrations of its own. Roles use Django's built-in auth groups. NestJS reads those groups and enforces them; it does not create a role store of its own.

This keeps the January release (season setup) independent of two large, risky moves: finding a successor for schema migrations, and moving logins off Django tokens. The cost is that admin features still run through Django in two ways: schema changes, and every authenticated request, which is validated by calling Django.

## Consequences

- Django must stay deployed and reachable. The API fails authentication if Django is down.
- "Django admin replaced" does not mean "Django retired". Retirement still requires a successor for migrations, a new auth design, and moving the DRF login-token table.
- As each area's new admin ships, its models become read-only in Django admin. Edits then go only through server-side validation and the audit record.
