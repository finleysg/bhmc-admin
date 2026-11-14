# Admin Modernization Plan

Status: Agreed direction. The finance track, results examples, and the Golf Genius API docs will refine details within slices.

Sources: [Administrative Inventory](admin-inventory.md), [glossary](../CONTEXT.md), [ADR 0001](adr/0001-django-retains-schema-and-auth.md).

## Direction

- **Replace Django admin; don't retire Django yet.** This plan delivers administration that never requires Django admin. Retiring Django is a separate follow-on project (see [Follow-on](#follow-on-django-retirement)). Until then Django owns the schema and auth, so new tables arrive through Django migrations ([ADR 0001](adr/0001-django-retains-schema-and-auth.md)).
- **Rebuild `apps/admin` in place, slice by slice.** Each slice replaces its old screens when it ships. Areas that already work (membership, club documents, photos, announcements, club player management) are re-skinned, not rewritten.
- **API first.** Business rules, permissions, validation, transactions, and audit history live in the NestJS API. Both the UI and the CLI are clients of it.
- **The CLI is for agents acting on the operator's behalf.** It authenticates with the operator's own token. Commands that change data default to a dry-run preview and require `--apply`. The audit record notes when an action came from the CLI. CLI commands ship with each slice; nothing requires the CLI to operate the club.
- **Someone else can take over.** A capable club leader who is not the current admin, and not a developer, must be able to run a season. Manual steps are written into the workflows, rules about which steps apply to which event are encoded rather than remembered, and settings are editable in the admin.
- **Lock down as you go.** When a slice ships, the models it covers become read-only in Django admin.
- **Don't rebuild for parity.** Improve the workflows that cause friction; drop obsolete screens.

## Shared foundations (Release 1)

- **Roles:** **Event Admin** and **Club Admin**, stored as Django auth groups and enforced on every API endpoint. This replaces today's browser-only superuser check. Group membership is managed in club player management. One person may hold both roles.
- **Audit record:** a single admin audit table (who, when, operation, event, client UI or CLI, JSON diff), written in the same transaction as the change. It is not fire-and-forget.
- **Settings:** a database-backed Settings page for operational values: alert lead times, stale-state thresholds, and alert recipients.
- **Alerts:** a daily scheduled email job. It sends nothing on days with no findings.

## Step 0 — Finance Track (parallel, starting now)

The treasurer doubts the accuracy of the finance report.

- Collect two or three events with concrete discrepancies, and the treasurer's expected numbers for each.
- Deliverable: a written comparison of expected and actual numbers for each event, concluding whether the cause is a calculation bug or a presentation problem.
- If it is a bug, fix it ahead of slice 6. The full finance workspace waits for slice 6.

## Release 1 — Season Setup and Registration Diagnostics (by mid-January)

Returning-member season registration opens in mid-January, so the Season Registration event must be rolled forward first.

### 1. Event Workspace

- Edit every event setting, the event's courses, its event fees, and its sessions in one workspace backed by NestJS. Event setup no longer calls Django.
- Create registration slots and append tee times as explicit operations. Fix the defects in the code being replaced:
  - slot recreation deletes before it creates, outside a transaction
  - clone runs outside a transaction
  - slots are created with status `"A "` (trailing space)

### 2. Readiness: Ready to Open Registration

Readiness is a shared diagnostic. It produces **findings**, each stating what is wrong, why it matters, and how to fix it. It is exposed through the API, the UI, the CLI, and alerts. Checks come from mistakes that have actually happened:

| Check                                                                                         | Severity |
| --------------------------------------------------------------------------------------------- | -------- |
| Dates out of order (priority signup ≤ signup start < signup end ≤ payments end ≤ event start) | Blocking |
| Event status is Canceled                                                                      | Blocking |
| Players choose slots but no slots exist                                                       | Blocking |
| Event had sessions in the previous season but has none now, or session fees are missing       | Blocking |
| Fees required but none configured; courses missing for tee-time or shotgun events             | Blocking |
| Start time, weekday, or signup offsets differ from most events of the same type this season   | Warning  |
| An event fee differs from other events of the same type using the same fee type this season   | Warning  |

- Warnings can be dismissed per event, for example a deliberate early start for the season opener.
- Daily alert: email Event Admins when an event's signup opens within the configured lead time (default 7 days) and the event has findings that are not dismissed.
- Golf Genius and document checks move to **Ready to Play** (slice 4).
- Format errors in free-text notes are out of scope.

### 3. Season Roll-forward

Roll-forward replaces Copy Event and event cloning in Django.

- Choose a source season. Each source event gets a proposed date: the same week and weekday, normally +364 days. Signup, priority, and payments-end dates keep their offsets from the event date.
- Review in a preview grid: adjust dates, drop events, add events.
- **Copied:** format and registration settings, courses, event fees, sessions, and session fees.
- **Reset:** status → Scheduled (canceled source events are included and selected by default, since they were usually rained out); Golf Genius ID, portal URL, and external URL cleared; season set to the target year.
- **Never copied:** registrations, results, documents, photos.
- **Created:** registration slots, for events where players choose slots.
- **Duplicate protection:** refuse any event whose name already exists in the target season.
- Everything is created in one transaction.
- **Season Fee Change:** change one fee type from an old amount to a new amount (for example weeknight cart $14 → $15), optionally limited to one event type. It covers event fees, session fees, and override amounts, and is previewed before it applies. It is available during roll-forward and on its own. It refuses events that already have registrations.

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

- Simple maintenance screens for tags, aces, board members, Dam Cup, fee types, and policies.
- Page content and club document codes: edit content for records that already exist. Creating new records is development work coordinated with public-site code.
- Read-only access to contact messages.
- Remove the dead admin routes for the import-skins, import-proxies, and import-team-results endpoints, which were removed from the API in November 2025.

Completion: club maintenance no longer requires Django admin.

## Design Boundaries

- Event configuration owns event validity. Roll-forward composes it across many events.
- Readiness is a shared diagnostic, tied to a milestone (Ready to Open Registration, Ready to Play), not a status screen. It is distinct from **event status** (Scheduled, Tentative, Canceled).
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
