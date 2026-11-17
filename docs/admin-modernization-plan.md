# Admin Modernization Plan

Status: Agreed direction. The finance track, results examples, and the Golf Genius API docs will refine details within slices.

Sources: [Administrative Inventory](admin-inventory.md), [glossary](../CONTEXT.md), [ADR 0001](adr/0001-django-retains-schema-and-auth.md), [ADR 0002](adr/0002-admin-ui-matches-public-site.md), [ADR 0003](adr/0003-admin-roles.md), [ADR 0005](adr/0005-admin-server-components-and-actions.md).

## Direction

- **Replace Django admin; don't retire Django yet.** This plan delivers administration that never requires Django admin. Retiring Django is a separate follow-on project (see [Follow-on](#follow-on-django-retirement)). Until then Django owns the schema and auth, so new tables arrive through Django migrations ([ADR 0001](adr/0001-django-retains-schema-and-auth.md)).
- **Rebuild `apps/admin` in place, slice by slice.** Each slice replaces its old screens when it ships. Areas that already work (membership, club documents, photos, announcements, club player management) are re-skinned, not rewritten. New and touched screens use shadcn/Tailwind, matching the public site with a jade primary ([ADR 0002](adr/0002-admin-ui-matches-public-site.md)).
- **API first.** Business rules, permissions, validation, transactions, and audit history live in the NestJS API. Both the UI and the CLI are clients of it.
- **The CLI is for agents acting on the operator's behalf.** It authenticates with the operator's own token. Commands that change data default to a dry-run preview and require `--apply`. The audit record notes when an action came from the CLI. CLI commands ship with each slice; nothing requires the CLI to operate the club.
- **Someone else can take over.** A capable club leader who is not the current admin, and not a developer, must be able to run a season. Manual steps are written into the workflows, rules about which steps apply to which event are encoded rather than remembered, and settings are editable in the admin.
- **Lock down as you go.** When a slice ships, the models it covers become read-only in Django admin.
- **Don't rebuild for parity.** Improve the workflows that cause friction; drop obsolete screens.

## Shared foundations (Release 1)

- **Roles:** **Event Admin** and **Club Admin**, stored as Django auth groups and enforced on every API endpoint. This replaces today's browser-only superuser check. Group membership is managed in club player management. One person may hold both roles. Superusers pass every role check. Both groups start empty ([ADR 0003](adr/0003-admin-roles.md)).
- **Audit record:** a single admin audit table (who, when, operation, event, client UI or CLI, JSON diff), written in the same transaction as the change. It is not fire-and-forget. The diff holds before and after values of the changed fields only, and is kept indefinitely. Only new and touched write endpoints are audited; existing endpoints are not retrofitted. Entries (`core.AdminAuditEntry`) also name the changed entity (`entity_type`, `entity_id`), since many changes are not tied to an event. The CLI sends `X-Admin-Client: cli`; everything else is recorded as the UI. A request that changes nothing writes no entry.
- **Settings:** a database-backed Settings page for operational values: alert lead times, stale-state thresholds, and alert recipients. Stored as key/value rows (JSON value, updated by, updated at). Each key's type and default are defined in API code, so adding a setting needs no migration. Recipients are plain email addresses. Club Admin edits Settings.
- **Alerts:** a daily scheduled email job at 7am Central. It sends one digest per recipient covering all their findings, and sends nothing on days with no findings. Each alert is an `AlertSource` (`apps/api/src/alerts`) producing findings addressed to a role or an email address. Role alerts go to active members of that Django group only; superusers are not added automatically. `GET /alerts/preview` shows what the next run would send. There is no duplicate-send protection: a restart at 7am or a second API instance could send a digest twice.
- **CLI shell:** `apps/cli` signs in through Django's login endpoint, stores the operator's token locally, prints structured JSON, and follows the dry-run/`--apply` convention. It starts with `login`, `logout`, and `whoami` (backed by `GET /me`); each slice adds its own commands. Conventions are in `apps/cli/README.md`.
- New tables (audit, settings) are added through Django migrations in the `core` app.

## Step 0 — Finance Track (parallel, starting now)

The treasurer doubts the accuracy of the finance report.

- Collect two or three events with concrete discrepancies, and the treasurer's expected numbers for each.
- Deliverable: a written comparison of expected and actual numbers for each event, concluding whether the cause is a calculation bug or a presentation problem.
- If it is a bug, fix it ahead of slice 6. The full finance workspace waits for slice 6.

## Release 1 — Season Setup and Registration Diagnostics (by mid-January)

Returning-member season registration opens in mid-January, so the Season Registration event must be rolled forward first.

### 1. Event Workspace

- Edit every event setting, the event's courses, its event fees, and its sessions in one workspace backed by NestJS. Event setup no longer calls Django.
- The workspace is tabbed: Event, Registration, Dates, Links, and Notes share one settings form; Courses and Slots appear when players choose a slot, Fees when the event has registration, and Sessions when players register for a session instead.
- **New event, copy from event (pull):** a new event starts blank, or "Copy from event" fills the new event form from an existing event chosen in a modal (defaulting to the current season). Its settings come over as they are, except the Golf Genius ID, portal and external URLs, and status (Scheduled); the season stays the one chosen on the events list. If an event date was entered first, the signup, priority, and payments-end dates move with it at the same club time; otherwise they start blank. Creating the event copies the source's courses, event fees, sessions, and session fees in the same transaction. This replaces Django's push-model Copy Event.
- Registration slots are explicit operations, never delete-and-recreate: create (only for an event with none), append a tee time, delete an empty group, and disable or re-enable a group. Create and delete are refused once registration opens (priority signup start, or signup start); append and disable are allowed during registration. Generated slots are all Available: the starter gap comes from the tee time calculator, not unavailable slots. The Slots tab shows a read-only tee sheet per course.
- **Locked down in Django:** the Event and Event Session admin screens (with their fees, courses, sessions, and fee overrides) are read-only, and the Django event API is read-only for create, update, and delete; its slot creation, tee-time append, and copy actions are removed. The photo tag (`default_tag`) moved to the workspace's Links tab. Fee types stay editable in Django until slice 9, and registration slots until the Registration Inspector (slice 4).
- **Changes after registration opens** (priority signup start, else signup start) need an override: the API refuses them with a 409 listing what changed, and the admin offers "Save anyway". Overridden writes are audited as `<operation>.override`. Locked: how registration works (event type, season, registration type, whether players choose, start type, group and team sizes, signup group sizes, GHIN and age rules), the signup start and priority signup start, players' start times (event date, start time, tee time splits, starter gap), signup end or payments end moved into the past or removed, and every fee add, edit, or delete. Name, notes, links, status, photo tag, and a signup end or payments end that stays in the future are free. Slot rules are unchanged. Locking everything after an event is closed waits for closeout (slice 6).
- **Public site cache:** after any successful write to an event, its sessions, or its slots, the API clears the public site's cached events (tag `events`) and the event's open spots (`event-slots-<id>`) through the public site's `/api/revalidate`, using `PUBLIC_NEXT_URL`. It is best effort: a failure is logged, and the public cache still expires on its own within 5 minutes.
- Every write is transactional and audited. This fixes the defects in the Django code it replaces:
  - slot recreation deletes before it creates, outside a transaction
  - clone runs outside a transaction
  - slots are created with status `"A "` (trailing space)

### 2. Readiness: Ready to Open Registration

Readiness is a shared diagnostic. It produces **findings**, each stating what is wrong, why it matters, and how to fix it. It is exposed through the API, the UI, the CLI, and alerts. Checks come from mistakes that have actually happened:

| Check                                                                                         | Severity |
| --------------------------------------------------------------------------------------------- | -------- |
| Dates out of order (priority signup ≤ signup start < signup end ≤ payments end ≤ event start) | Blocking |
| Players choose tee times but the start time is not a time like "2:00 PM"                      | Blocking |
| Event status is Canceled                                                                      | Blocking |
| Players choose slots but no slots exist                                                       | Blocking |
| Event had sessions in the previous season but has none now, or session fees are missing       | Warning  |
| Fees required but none configured; courses missing for tee-time or shotgun events             | Blocking |
| Start time, weekday, or signup offsets differ from most events of the same type this season   | Warning  |
| An event fee differs from other events of the same type using the same fee type this season   | Warning  |

- **Date order is also event validity.** The workspace refuses to save an event whose dates are out of order (one shared rule, `dateOrderIssues` in `packages/domain`). Deadlines are compared with the event by club-local calendar date, because the start time is free text. Season Registration is exempt from the comparison with its event date, which is the day its registration opens. The same goes for the start time when players choose tee times: it is the tee sheet's first tee time, so it must read like "2:00 PM" (`startTimeIssue`); otherwise it stays free text such as "Morning Swing". The other blocking checks depend on fees, courses, slots, and sessions added after the event is created, so they are findings, not save errors.
- Session findings: a warning when the same event last season (same name, or the name with the year moved back) had sessions and this one has none, or when a session that had fee overrides last season has none now. A session with no overrides is otherwise normal. They are warnings, not blocking, because dropping sessions or overrides can be deliberate.
- Peer comparisons (start time, weekday, signup offsets, fees) need at least three other non-canceled events of the same type in the season, and a value more than half of them share.
- Warnings can be dismissed per event, for example a deliberate early start for the season opener. A dismissal names the check and its subject (for example the fee type), so dismissing one fee's warning does not hide another's. Dismissals (`core.ReadinessDismissal`) and restores are audited.
- **Readiness indicator:** the event header (every event page) and the events list show a dot computed from the findings, never stored: red for any blocking finding, yellow for warnings not dismissed, green for neither. It links to the findings page, where each finding links to the workspace tab that fixes it. It shows only while Ready to Open Registration applies: for events with registration, until registration opens (priority signup start, else signup start). It is Event Admin only; other admins see the pages without it.
- Daily alert: email Event Admins when an event's signup opens within the configured lead time (default 7 days) and the event has findings that are not dismissed. Alert findings name the event; they carry no link because the API has no admin URL setting.
- Golf Genius and document checks move to **Ready to Play** (slice 4).
- Format errors in free-text notes are out of scope.

### 3. Season Roll-forward

Roll-forward replaces event cloning in Django for a whole season at once. Copying a single event is "Copy from event" on the new event form (slice 1).

- Choose a source season ("Roll forward" on the events list); the target is the next season. Each source event gets a proposed date 364 days later (same weekday), and its name with the source year moved to the target year ("2026 Season Registration" → "2027 Season Registration"). Signup, priority, and payments-end dates keep their offsets from the event date, at the same club time.
- Review in a preview grid: uncheck events to drop them, and edit names and dates. New events are added afterwards with New event, which can copy from any event.
- **Copied:** format and registration settings, courses, event fees, sessions, and session fees.
- **Reset:** status → Scheduled (canceled source events are included and selected by default, since they were usually rained out); Golf Genius ID, portal URL, and external URL cleared; season set to the target year.
- **Never copied:** registrations, results, documents, photos.
- **Created:** registration slots, for events where players choose slots.
- **Refused:** an event whose name already exists on its date (the same rule as New event; names repeat within a season, such as "Individual LG/LN"), two events in the roll-forward with the same name and date, settings that are not a valid event, and an event where players choose slots but there are no courses. The preview lists each event's issues (`POST /seasons/roll-forward/preview`).
- Everything is created in one transaction (`POST /seasons/roll-forward`): if any event is refused, nothing is created. Each new event is audited as `event.rollforward`, naming its source event.
- **Season Fee Change:** change one fee type from an old amount to a new amount across a season (for example weeknight cart $14 → $15), optionally limited to one event type. Every amount of that fee type equal to the old amount changes: event fee amounts, override amounts, and session fees (a $17 senior override changes only in its own $17 → $18 change). It is previewed before it applies (`POST /seasons/fee-change/preview`), and the admin applies only the change it previewed. Events with registrations, or whose registration has opened, are listed and left unchanged (their fees can still be changed in the workspace's Fees tab with "Save anyway"); the rest change in one transaction (`POST /seasons/fee-change`), audited per event fee as `event.fee.season-change`. It is its own page ("Change a fee" on the events list); after a roll-forward, run it on the new season, whose events have no registrations yet.

### 4. Registration Inspector

Diagnostics come first. Most real registration problems have so far meant working in the database directly.

- Look up a **player** (name, GHIN, or email) or an **event + group**.
- One view shows:
  - the registration and its group
  - slots and slot status, including when a pending hold expires
  - event fees charged
  - payments and refunds with their Stripe IDs
  - a **live Stripe status check** that flags any mismatch with the database
  - the registration change log
  - the player's Golf Genius member ID
  - the player's other registrations this season
- The only repair in this release: set a slot's status to Reserved, Available, or Unavailable, recorded in the audit history.

### Release 1 CLI

`readiness`, `inspect registration`, `season roll-forward`, `fees change` — all with structured JSON output.

Completion: next season can be created, configured, given slots, and confirmed Ready to Open Registration without Django admin, and registration problems can be diagnosed without querying the database.

## Before the Season Starts (April)

### 5. Pre-event Preparation

Golf Genius's API supports writing roster players and reading data (tee sheets, results). It provides no evidence of creating or cloning events, completing events, setting tee times, exporting files, removing players, or webhooks. The official v2 API reference is available only through Golf Genius support, so ask for it to confirm. Until then, those steps stay manual.

- A checklist per event:
  1. Create the event in Golf Genius (manual; treated as done once the event is linked to its Golf Genius ID)
  2. Sync Event
  3. Export Roster
  4. Complete setup in Golf Genius (manual)
  5. Import Tee Sheet
  6. Post the tee sheet and flights (Golf Genius report files, uploaded as Event Documents)
- System steps are marked done automatically from the integration log and documents. Manual steps are confirmed by hand, with instructions shown in the checklist.
- **Changes since the last roster export:** show the count, list drops as "remove these in Golf Genius" (the API cannot remove players), and mark export and later steps as needing a rerun, including a stale tee sheet. These are warnings, never blockers, because last-minute changes are normal.
- **Ready to Play** readiness: Golf Genius linked, roster exported, tee sheet imported, documents posted.
- **Job progress reconnects:** a page that loses the progress stream re-attaches to the running job and shows its progress from the integration log. Add a run ID and a summary to integration-log entries so the CLI can return structured results. No job queue.

### 6. Results and Closeout

- The closeout checklist shows only the imports that apply, derived from event and tournament data:
  - **Import Scores and Import Low Scores:** weeknight events except scrambles and shambles. Determine which data field identifies a scramble or shamble during this slice.
  - **Import Points:** events that award points.
  - **Import Results and Import Champions:** every event.
- Each step is marked done from the integration log, and reruns after a result changes are supported.
- The **challenge period** is advisory. Closing an event has no codified prerequisite guards.
- **Alert:** results not confirmed, meaning results were imported but the event was not closed within the configured number of days. Recipients are set in Settings.
- **Results PDF:** generate a compact, readable PDF directly from results for events that follow the regular pattern, with no manual reformatting, and upload it as an event document. The two club championships stay manual. Examples will be provided when the slice starts.
- Edit and delete low scores and champions in the admin, recorded in the audit history. A later import reports a conflict instead of silently overwriting a manual correction. This is low priority, because the bug that caused most corrections (incomplete rounds treated as low scores) is fixed.

## Then

### 7. Payouts and Finance

- Payout states are **Pending** (on import) → **Confirmed** (on close) → **Posted** for credit payouts or **Delivered** for cash (skins) payouts. "Paid" is retired.
- Marking stays all at once per event and payout type, guarded by Confirmed. Record who marked it and when.
- **Alerts:** credit payouts not Posted, and cash payouts not Delivered, within the configured number of days after close. Each has its own recipient list, so the pro shop liaison and the treasurer each get their own reminders without a third role.
- Apply the finance track's conclusions: explainable finance calculations reconciled against the treasurer's examples.

### 8. Registration Repairs and Event Player Management

- Rebuild event player management, preserving its current workflows (add, drop, move, replace, swap, notes) with better UX and cleaner code.
- Add named repair operations as real cases appear. Each checks the data's state before running and is recorded in the audit history. Do not build a general table editor.

### 9. Club Content and Records

- **Close the Django write gap.** Django's document, static document, document code, tag, photo, and page content endpoints use `IsAuthenticatedOrReadOnly`, so any signed-in member can write to them directly. The NestJS role guard ([ADR 0003](adr/0003-admin-roles.md)) never sees these calls. Require Club Admin for writes, either in Django or by moving the endpoints to NestJS.
- Simple maintenance screens for tags, aces, board members, Dam Cup, fee types, and policies.
- Page content and club document codes: edit content for records that already exist. Creating new records is development work coordinated with public-site code.
- Read-only access to contact messages.
- Remove the dead admin routes for the import-skins, import-proxies, and import-team-results endpoints, which were removed from the API in November 2025.

Completion: club maintenance no longer requires Django admin.

## Design Boundaries

- Event configuration owns event validity. Roll-forward composes it across many events.
- Readiness is a shared diagnostic, tied to a milestone (Ready to Open Registration, Ready to Play), not a status screen. It is distinct from **event status** (Scheduled, Tentative, Canceled). The readiness indicator summarizes the current milestone's findings; it is never called a status.
- Pre-event preparation and closeout are separate workflows with different prerequisites and recovery needs.
- Troubleshooting exposes context and targeted repairs, not table editors.
- Local corrections are never silently overwritten by later imports.
- Consequential operations offer a preview. Retries must not duplicate external effects.
- Prefer state derived from existing data (integration log, documents, payouts) over new stored status fields.

## Removal Candidates

- **Season Long Points** (replaced by Tournament Points) and **Sites** (Django-only): no replacement.
- **Announcements and Players in Django admin:** already replaced.
- **Tokens:** this is the DRF login-token table that both admins use for every sign-in. Keep it until auth moves off Django.

## Follow-on: Django Retirement

Not part of this plan. Before retiring Django, verify that:

- Authentication no longer depends on Django tokens or its `/auth/users/me/` endpoint.
- Remaining Django endpoints used by the admin (documents, static documents, document codes, tags, photos) have moved to NestJS.
- Public-site behavior, jobs, integrations, and operational scripts no longer depend on Django.
- Schema migrations have a defined successor.
- Rare troubleshooting needs (imported tournament data, courses, tees, scorecards) have a supported inspection path.

## Remaining Inputs

- Finance discrepancies and expected numbers from the treasurer (Step 0).
- Results report before-and-after examples (slice 6).
- The official Golf Genius v2 API reference, requested from Golf Genius support (slice 5).
