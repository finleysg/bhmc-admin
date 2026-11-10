# Application state machines and reachable failures

Reviewed 2026-11-07. This is a source-level audit of the checked-out application, not evidence of production incidents. “Confirmed” below means a concrete callable path or interleaving establishes the failure; fault-injection scenarios explicitly require the stated failure. No live charges or refunds were made. Issues are proposed work groups, not externally filed tickets.

## Model and scope

State is distributed across Django-owned database rows, Nest services, Stripe callbacks, browser reducers and timers. A single status field does not describe a registration. Its effective state is `(slot status, ownership, expiry, payment code, payment confirmed, fee paid flags)`. Django models define storage; there are no schema migrations proposed here. Sources below are relative to the repository root and include symbols or line numbers for navigation.

The tables cover the principal explicit domain states and implicit asynchronous workflows inspected. They are not a claim to exhaustively verify every Django endpoint, import format, or UI component. In particular, capacity locking, administrative move/swap paths and legacy Django payment writers need additional review before declaring global invariants enforced.

## States, invariants and transition tables

### Registration reservation and expiry

Source: `packages/domain/src/types/register/choices.ts`; `apps/api/src/registration/services/registration.service.ts` (`createAndReserve`, `reserveChoosableSlots`, `createNonChoosableSlots`, `cancelRegistration`); `cleanup.service.ts` in the same directory.

| From                | Trigger / guard                                                  | To / effects                                                     |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Available A         | Reserve choosable slots under transaction and availability check | Pending P; registration/player assigned; reservation expiry      |
| No slot             | Reserve non-choosable event after capacity checks                | New P slots                                                      |
| P                   | Payment intent persisted; `paymentProcessing`                    | Awaiting payment X; expiry cleared                               |
| X with player       | Successful payment webhook                                       | Reserved R                                                       |
| Empty selected slot | Payment completion                                               | A with ownership cleared, or deletion for non-choosable event    |
| P                   | Expiration query then cleanup                                    | A/deleted; registration user and expiry nulled; payments deleted |
| Unpaid draft        | Owner cancellation; no confirmed or non-`pending` payment        | A/deleted and detached registration                              |
| R                   | Cleanup                                                          | Intended no-op; read-time guard skips R                          |
| Unavailable U       | Administrative blocking state                                    | Not reservable by availability checks; not a payment state       |

Required invariants: A has no registration/player; occupied slots belong to one live reservation; expiry must not reclaim paid or in-flight work; R must survive cleanup; X must retain a recoverable payment association. These are cross-row invariants, not guaranteed by TypeScript types. X may legitimately remain after a declined payment: failed-payment handler only logs and stale-payment handling alerts rather than automatically releasing it.

### Payment, fees, membership and notifications

Sources: `apps/api/src/registration/services/payments.service.ts:76,127,222,329,358`; `apps/api/src/stripe/stripe-webhook.service.ts`; `admin-registration.service.ts`.

| From          | Trigger                                | To / effects                                                          |
| ------------- | -------------------------------------- | --------------------------------------------------------------------- |
| Absent        | Create payment and details             | `pending`, unconfirmed, unpaid fees                                   |
| Draft         | Update payment                         | Delete old details, update totals, insert unpaid details              |
| Draft         | Create intent                          | Stripe intent code/secret stored; slots X                             |
| Intent exists | Retry intent endpoint                  | New create request; local code overwritten (no state guard)           |
| Intent exists | Success webhook, local confirmed false | Slots R, then confirmed flag, then fees paid, then empty-slot cleanup |
| Confirmed     | Duplicate success webhook              | Skip all completion work                                              |
| Confirmed     | Confirmation helper                    | Season membership update, email, optional change log                  |
| Absent        | Admin payment request                  | `Requested`, unconfirmed; X slots                                     |
| Absent        | Admin waiver                           | `Waived`, confirmed; slot behavior differs by event selection mode    |

Required invariants: confirmed implies durable fee/slot completion; edits cannot invalidate a captured payment; one logical purchase retains every external intent association; membership completion cannot depend on best-effort email handling; retries finish interrupted work. Confirmation is not currently one atomic transition.

### Refunds

Sources: `apps/api/src/registration/services/refund.service.ts:22-96,126-136`; `apps/api/src/stripe/stripe-webhook.service.ts` (`handleRefundCreated`, `handleRefundUpdated`); `apps/api/src/stripe/stripe.service.ts:36-58`.

| From                 | Trigger                               | To / effects                                                                        |
| -------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| Paid fees            | Refund request                        | Transaction creates random pending code; explicitly requested fee IDs become unpaid |
| Pending local refund | Stripe create succeeds                | Replace pending code with Stripe refund ID                                          |
| Pending local refund | Stripe call or code persistence fails | Remains pending; exception; no fee compensation                                     |
| No matching refund   | `refund.created`                      | Insert unconfirmed refund                                                           |
| Matching refund      | `refund.created` retry                | Skip                                                                                |
| Unconfirmed          | `refund.updated`, succeeded           | Confirm; send notification                                                          |
| Missing refund       | `refund.updated`, succeeded           | Warn and return from confirmation; handler still proceeds                           |
| Any refund           | Non-success update                    | Log only                                                                            |

Required invariants: refund selection and fee mutation refer to the same payment; paid flags must reflect settled economics; pending operations need stable identity and recovery; terminal success must survive out-of-order delivery. Empty selection means all details when calculating amount, but does not mean all details when updating flags.

### Event lifecycle and tournament payouts

Sources: `packages/domain/src/types/events/choices.ts`; `apps/api/src/events/events.service.ts:133-149,195-230`; `apps/api/src/golfgenius/services/import-all-results.service.ts`.

| Machine           | From / trigger                                                                    | To                                                                      |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Event designation | Administrative status edit                                                        | Tentative T, Scheduled S, or Canceled C; separate from payout lifecycle |
| Results           | Import creates results                                                            | Pending payout                                                          |
| Payout            | `closeEvent`, requires tournaments                                                | All results Confirmed; payout date overwritten                          |
| Payout            | Mark paid, positive amount and requested payout type; all matching rows Confirmed | Paid                                                                    |
| Import progress   | Start / tournament processed                                                      | Processing; counts advance; Complete when processed reaches total       |

Invariants: Paid is terminal absent an explicit reversal; closing again must not make paid results payable again. Import progress describes work, not transactional durability of the whole import. Event cancellation must not be assumed to refund registrations: these are separate machines.

### Browser registration, payment wait and live updates

Sources: `apps/public-next/lib/registration/registration-reducer.ts`; `lib/hooks/use-payment-timeout.ts`; `lib/hooks/use-registration-sse.ts`; `lib/registration/sse-version-tracker.ts` (all under `apps/public-next`).

| From                 | Action                     | To                                                                                            |
| -------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| Idle/pending         | Event load/reset           | Idle/pending with no registration/payment                                                     |
| Idle/reserve         | Create registration        | New/register with registration/payment                                                        |
| Idle                 | Load existing registration | Edit/register, existing fee map                                                               |
| Any step             | `update-step`              | Supplied pending/reserve/register/review/payment/complete; reducer imposes no adjacency guard |
| Active               | Cancel                     | Idle/pending, data cleared                                                                    |
| Active               | Complete                   | Idle/complete, data cleared                                                                   |
| Not processing       | Processing flag true       | Timer armed                                                                                   |
| Processing           | Timeout                    | Invoke callback; does not cancel Stripe or mutate server state                                |
| Processing           | Flag false/unmount         | Timer cleared                                                                                 |
| Disconnected         | Enable/event present       | Connecting                                                                                    |
| Connecting           | Open                       | Connected, retry counter zero                                                                 |
| Connected/connecting | Error                      | Close; exponential retry, then periodic recovery                                              |
| Cached version n     | SSE version greater than n | Apply newer snapshot                                                                          |
| Cached version n     | Older/equal version        | Ignore                                                                                        |
| SSE disconnect       | Version reset by consumer  | HTTP polling can refresh again                                                                |

Invariants: browser completion is not financial confirmation; timeout is not cancellation; server authorization remains authoritative. Reducer permits structurally inconsistent combinations if dispatched directly, but that alone is not proof a normal UI path reaches them. Reset/cancel/complete also retain `stripeClientSession`; downstream reuse needs investigation before calling it a confirmed user-visible defect.

### Authentication

Source: `apps/public-next/lib/auth-context.tsx` (`checkAuth`, `refreshUser`, `login`, `logout`).

| From          | Trigger                     | To                                             |
| ------------- | --------------------------- | ---------------------------------------------- |
| Loading       | Current-user response/error | Authenticated(user) / anonymous; loading false |
| Anonymous     | Successful login            | Authenticated(user)                            |
| Authenticated | Successful logout           | Anonymous; navigate home                       |
| Either        | Refresh resolves            | Replace user with returned user/null           |

Invariant: later session intent should win over older asynchronous responses. There is no generation guard: a refresh started before logout can resolve afterward and restore stale authenticated UI. This is a client-state race, not evidence of bypassing server authentication.

## Prioritized, grouped implementation issues

### 1. P1 — Make payment settlement atomic and completion retryable

**Confirmed fault path:** `paymentConfirmed` sets `confirmed=1` at `payments.service.ts:394-397` before updating paid fee flags. Fail the subsequent detail query/update (database interruption or process termination). On webhook retry, `handlePaymentIntentSucceeded` sees confirmed and returns. Permanent state: confirmed payment with unpaid fees; empty-slot cleanup also may never execute. Similarly, membership update is inside `sendConfirmationEmail` after confirmation and inside a catch that only logs: a transient failure leaves a paid season registration without membership, and retry skips it.

Fix group: transactional local settlement; durable completion/outbox state for membership, mail and logs; idempotent side-effect processing. Acceptance: inject failure at each awaited boundary; retry must finish fees, slots and membership without duplicating notification delivery. Concurrent duplicate webhook deliveries must not independently execute completion side effects.

### 2. P1 — Serialize expiration/cancellation against payment processing

**Confirmed interleaving:** cleanup selects expired P registrations (`registration.repository.ts:394-408`); payment creation then persists the intent and changes slots to X; cleanup resumes and unconditionally deletes payment details/payment (`cleanup.service.ts:36-42`), releases X slots and nulls registration ownership. The webhook lookup now finds no local payment and returns normally. This loses the association required to settle an external payment.

A second race defeats the R protection: `releaseSlots` reads X, concurrent confirmation changes it to R, then cleanup updates/deletes the previously computed IDs. `updateRegistrationSlots` filters only by IDs (`registration.repository.ts:277-286`). Read-time guards are not compare-and-set protection.

Fix group: shared transactional reservation locking, conditional state transitions and affected-row checks; never discard an external intent association. Acceptance: barrier-controlled cleanup vs intent creation, success webhook and cancellation; R and in-flight payments remain recoverable.

### 3. P1 — Freeze payment contents and bind intents to their registration

**Confirmed direct path:** authenticated owner calls PUT `/payments/:id` on their confirmed payment. Controller checks existence and ownership only; `updatePayment` deletes paid details and inserts replacements with `isPaid:0` while leaving confirmed set. A webhook retry cannot repair this (issue 1). Partial failure during this nontransactional update can also leave no details, or totals inconsistent with details. Two concurrent updates can each delete before either inserts, producing combined detail sets.

The intent endpoint also accepts caller-supplied event/registration IDs while checking only ownership of the payment; `createPaymentIntent` passes those IDs into metadata and `paymentProcessing`, with no association validation. A caller with their own payment can target another registration's P slots and trigger its transition to X. This is reachable through the API, independent of UI guards.

Fix group: validate payment/event/registration/slot ownership together; freeze drafts once externally payable; transactional replacement with revision checks; track intent attempts durably. Acceptance: reject edits after intent creation/confirmation and mismatched registration IDs; concurrent updates cannot combine details. Repeated intent requests must not silently replace the only stored external reference. Do not claim a demonstrated double charge here without exercising the external provider.

### 4. P1 — Give refunds a recoverable operation identity and consistent fee selection

**Confirmed direct paths:** empty fee selection calculates a full refund but skips the fee update entirely (`refund.service.ts:35-43,65-70`), so refunded fees remain paid. Conversely, selected fees are marked unpaid before Stripe; a rejected Stripe call leaves unpaid fees despite no returned funds. Retry then calculates zero and rejects.

**Confirmed selection mismatch:** include one paid fee from the target payment and an ID from another payment. Calculation filters to target details, but the SQL update uses the entire raw request ID list. The other payment's fee becomes unpaid without being refunded.

**Confirmed concurrency path:** two partial refund requests read the same paid fees before either transaction updates them. Each creates a pending record and makes a Stripe request without an operation idempotency key. Duplicate external refund requests are certain; two successful refunds depend on remaining refundable balance (not asserted unconditionally).

**Confirmed ordering path:** succeeded update arrives before local code persistence or refund-created insertion: `confirmRefund` returns for missing record. Later insertion starts unconfirmed. A created webhook racing code persistence can instead insert a second record with the final code, conflicting with the pending record's update (Django refund code is unique).

Fix group: persist stable operation identity, lock selected fee rows, validate exact membership, model pending/failed/succeeded separately, use provider idempotency and reconcile out-of-order events. Acceptance: all/partial/mixed-payment selection, duplicate requests, provider rejection, response loss, and both webhook orders.

### 5. P1 — Keep paid payouts terminal across repeated event close

**Confirmed sequential path:** close event → mark payouts Paid → close event again. `closeEvent` updates every result to Confirmed without a source-state predicate. Paid results become eligible for mark-paid again and their date changes. This proves ledger regression, not an automatic second bank transfer.

Fix group: close only Pending results; preserve Paid/date; serialize close, import and payout transitions. Acceptance: repeat close after partial and full payouts; Paid must remain Paid. Audit import overwrite behavior separately before claiming it is safe.

### 6. P2 — Complete waived choosable registrations consistently

**Confirmed direct path:** create admin registration for a choosable event with `collectPayment=false`. `createChooseableRegistration` writes a confirmed Waived payment (`admin-registration.service.ts:364-371`) but unconditionally writes X slots and unpaid fees (`383-395`). `createAdminRegistration` returns immediately for this branch, without settlement. No Stripe webhook exists to advance the waived purchase.

Fix group: explicit waiver settlement shared across both event modes; define paid-vs-waived fee semantics. Acceptance: waived choosable slots become final reservations and do not remain awaiting payment.

### 7. P2 — Ensure latest authentication operation owns browser state

Confirmed asynchronous ordering described in the authentication table: start refresh, complete logout, resolve refresh with its earlier user snapshot. `setUser(currentUser)` has no freshness check. Impact is misleading signed-in UI until refresh, not server access. Fix with an operation generation/cancellation mechanism. Acceptance: deferred-response tests for refresh/logout and initial check/login.

## Evidence limits and validation

Findings are established by source traces and explicit schedules above; these schedules were not executed against a live MySQL/Stripe environment. Existing unit tests do not by themselves prove concurrency safety. Proposed acceptance cases belong in the grouped fixes rather than duplicating implementation details in this documentation-only change. No application code, schema or external issues were changed.

Repository verification: `pnpm format`, `pnpm lint`, `pnpm test`, `pnpm typecheck`, and `pnpm build` passed. Turbo reused cached results for lint/test/typecheck/build; these checks do not execute the race schedules above. Only this document changed, so no Next.js container rebuild was needed.
