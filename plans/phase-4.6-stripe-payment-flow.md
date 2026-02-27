# Phase 4.6: Stripe Payment Flow — TDD Implementation Plan

## Context

The public-next registration flow (reserve → register → review) is complete. The review page navigates to `/${payment.id}/payment` when amount > 0, but the payment pages don't exist yet. This phase adds the Stripe payment UI: a layout wrapping `<Elements>`, a payment form page, and a post-redirect completion page.

The Stripe CLI Docker container requires interactive authorization on every restart, making it unreliable for e2e testing. We'll address this with a pragmatic testing strategy that doesn't depend on the Stripe CLI.

## Prerequisites

Install Stripe client packages:

```bash
pnpm --filter public-next add @stripe/stripe-js @stripe/react-stripe-js
```

## Files to Create

```
apps/public-next/
├── app/event/[eventDate]/[eventName]/[paymentId]/
│   ├── layout.tsx              # Stripe Elements wrapper + PaymentAmountContext
│   ├── payment/page.tsx        # PaymentElement form + submit flow
│   └── complete/page.tsx       # Post-redirect status display
└── lib/
    ├── hooks/
    │   ├── use-payment-timeout.ts    # Port from legacy
    │   └── use-stripe-amount.ts      # TanStack Query hook
    └── __tests__/
        ├── use-payment-timeout.test.ts
        ├── use-stripe-amount.test.ts
        ├── payment-layout.test.tsx
        ├── payment-page.test.tsx
        └── complete-page.test.tsx
```

## TDD Implementation Order

Each step follows RED → GREEN → REFACTOR.

---

### Step 1: `use-payment-timeout` hook

**Test first** (`lib/__tests__/use-payment-timeout.test.ts`):

- Calls `onTimeout` after duration when `isProcessing=true`
- Does NOT call `onTimeout` when `isProcessing=false`
- Clears timeout when `isProcessing` transitions to `false`
- Uses default 120s timeout

**Implement** (`lib/hooks/use-payment-timeout.ts`):

- Direct port from `apps/public/src/hooks/use-payment-timeout.ts`
- Pure React hook: `useRef` for timer, `useEffect` to start/clear, `useCallback` for cleanup

---

### Step 2: `use-stripe-amount` hook

**Test first** (`lib/__tests__/use-stripe-amount.test.ts`):

- Fetches `/api/payments/${paymentId}/stripe-amount` on success
- Disabled when `paymentId` is 0
- Returns error state on fetch failure

**Implement** (`lib/hooks/use-stripe-amount.ts`):

- TanStack Query `useQuery` wrapping a fetch to the existing API route
- Returns `StripeAmountResponse` (from `lib/registration/types.ts`)
- `enabled: paymentId > 0`, `staleTime: 0`

---

### Step 3: Payment Layout

**Test first** (`lib/__tests__/payment-layout.test.tsx`):

- Renders `<Elements>` provider when stripe amount loads
- Calls `initiateStripeSession()` on mount
- Shows nothing (or loading) while stripe amount is pending
- Passes amount data to children via `PaymentAmountContext`

**Implement** (`[paymentId]/layout.tsx`):

- `"use client"` — uses `useParams()` for `paymentId`
- `useState(() => loadStripe(...))` to avoid SSR issues
- Calls `useStripeAmount(paymentId)` and `useRegistration().initiateStripeSession()`
- Creates `PaymentAmountContext` + exports `useCurrentPaymentAmount()` hook
- Wraps children in `<Elements stripe={...} options={{ mode: "payment", currency: "usd", amount: amountCents, customerSessionClientSecret }}>`
- Returns null while loading, error div on failure

**Reference**: `apps/public/src/screens/registration/payment-flow.tsx`

---

### Step 4: Payment Page

**Test first** (`lib/__tests__/payment-page.test.tsx`):

- Renders PaymentElement and submit button
- Displays amount due from `useCurrentPaymentAmount()`
- Submit flow: `elements.submit()` → `createPaymentIntent()` → `stripe.confirmPayment()`
- Shows error when `elements.submit()` fails (does NOT call `createPaymentIntent`)
- Back button navigates to review page and calls `updateStep(ReviewStep)`
- Button disabled when `!stripe || !elements || paymentProcessing || paymentSubmitted`

**Mock strategy**: Mock `@stripe/react-stripe-js` (useStripe, useElements, PaymentElement), `next/navigation`, registration context, auth context, `useCurrentPaymentAmount`, and `usePaymentTimeout`.

**Implement** (`[paymentId]/payment/page.tsx`):

- Three-phase submit: validate → create intent → confirm payment
- `AbortController` + operation tracker for cancellation safety
- `usePaymentTimeout` with 2-minute duration
- `window.onbeforeunload` during processing (useEffect)
- Force cancel button when processing
- Countdown timer for new registrations
- `CancelButton` and Back button
- `return_url` for Stripe redirect: replace `/payment` with `/complete` in current pathname

**Reference**: `apps/public/src/screens/registration/payment.tsx` (lines 160-271 for submit flow)

---

### Step 5: Complete Page

**Test first** (`lib/__tests__/complete-page.test.tsx`):

- Shows "Payment Complete" + amount + email on `succeeded` status
- Shows processing message on `processing` status
- Shows verification required on `requires_action` status
- Shows "Payment Failed" + retry link on `requires_payment_method` status
- Shows error when `retrievePaymentIntent` fails
- Shows error when client secret is missing from URL
- Renders "See All Players" and "Home" links

**Implement** (`[paymentId]/complete/page.tsx`):

- Reads `payment_intent_client_secret` from `useSearchParams()`
- `useEffect` calls `stripe.retrievePaymentIntent(clientSecret)`
- Conditional rendering based on `intent.status`
- Uses shadcn Card, Alert, Button components (same pattern as review page)
- Links: event registrations page via `getEventUrl()`, home

**Reference**: `apps/public/src/screens/registration/registration-complete.tsx`

---

## UI Sketches

All pages use the same `Card` pattern as the existing review page (`md:max-w-[60%]`).

### Payment Page — Desktop

```
┌──────────────────────────────────────────────┐
│ CardHeader                                   │
│  Submit Payment                              │
├──────────────────────────────────────────────┤
│ CardContent                                  │
│                                              │
│  Amount due: $26.05                          │
│                                              │
│  ┌ Processing status (visible during submit) │
│  │ ◌ Creating secure payment...              │
│  │                       [Force Cancel]      │
│  └                                           │
│                                              │
│  ┌ Error alert (if any)                    ┐ │
│  │ ⚠ Card was declined.                   │ │
│  └                                         ┘ │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Stripe PaymentElement (iframe)         │  │
│  │                                        │  │
│  │  ◉ Card    ○ Bank    ○ Wallet          │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │ Card number                      │  │  │
│  │  │ MM / YY          CVC             │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
├──────────────────────────────────────────────┤
│ CardFooter                                   │
│                                              │
│  Time remaining: 4:32                        │
│                                              │
│            [Cancel]  [Back]  [Submit Payment] │
└──────────────────────────────────────────────┘
```

### Payment Page — Mobile

```
┌──────────────────────────┐
│ Submit Payment           │
├──────────────────────────┤
│                          │
│ Amount due: $26.05       │
│                          │
│ ┌──────────────────────┐ │
│ │ Stripe PaymentElement│ │
│ │                      │ │
│ │ ◉ Card               │ │
│ │ ┌──────────────────┐ │ │
│ │ │ Card number      │ │ │
│ │ │ MM/YY    CVC     │ │ │
│ │ └──────────────────┘ │ │
│ └──────────────────────┘ │
│                          │
├──────────────────────────┤
│ Time remaining: 4:32     │
│                          │
│ [Submit Payment]         │
│ [Back]                   │
│ [Cancel]                 │
└──────────────────────────┘
```

### Complete Page — Desktop (Success)

```
┌──────────────────────────────────────────────┐
│ CardHeader                                   │
│  Payment Complete                            │
├──────────────────────────────────────────────┤
│ CardContent                                  │
│                                              │
│  Your payment for $26.05 has been processed. │
│                                              │
│  A confirmation email will be sent to        │
│  paul@example.com and anyone you signed up   │
│  unless this is just an update. A payment    │
│  receipt will also be sent from Stripe.      │
│                                              │
├──────────────────────────────────────────────┤
│ CardFooter                                   │
│                                              │
│            [See All Players]  [Home]         │
└──────────────────────────────────────────────┘
```

### Complete Page — Desktop (Failed)

```
┌──────────────────────────────────────────────┐
│ CardHeader                                   │
│  Payment Failed                              │
├──────────────────────────────────────────────┤
│ CardContent                                  │
│                                              │
│  Payment failed                              │
│                                              │
│  Your payment method was declined. Please    │
│  return to the payment page and try a        │
│  different payment method.                   │
│                                              │
│  [Try Again]                                 │
│                                              │
├──────────────────────────────────────────────┤
│ CardFooter                                   │
│                                              │
│            [See All Players]  [Home]         │
└──────────────────────────────────────────────┘
```

### Complete Page — Mobile (Success)

```
┌──────────────────────────┐
│ Payment Complete         │
├──────────────────────────┤
│                          │
│ Your payment for $26.05  │
│ has been processed.      │
│                          │
│ A confirmation email     │
│ will be sent to          │
│ paul@example.com and     │
│ anyone you signed up.    │
│                          │
├──────────────────────────┤
│   [See All Players]      │
│   [Home]                 │
└──────────────────────────┘
```

## Key Architectural Decisions

1. **PaymentAmountContext in layout** — mirrors legacy's `useOutletContext` pattern. The layout fetches stripe-amount once, passes to children via context. Avoids duplicate fetches.

2. **`loadStripe` in `useState` initializer** — prevents SSR execution and ensures single initialization per component instance.

3. **Navigation blocker** — Next.js has no `useBlocker`. Use `window.onbeforeunload` for tab close/refresh. The existing registration guard (`useRegistrationGuard`) handles in-app navigation. During payment processing, the guard will show the existing confirmation dialog.

4. **Stripe `confirmPayment` with `return_url`** — on success, Stripe redirects to the complete page (doesn't return). On error, it returns the error. The code handles both paths.

## Existing Code to Reuse

| What                                                                                   | Path                                                  |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Registration context (createPaymentIntent, initiateStripeSession, stripeClientSession) | `lib/registration/registration-provider.tsx:258-589`  |
| Payment types (StripeAmountResponse, PaymentAmount, CustomerSessionResponse)           | `lib/registration/types.ts`                           |
| formatCurrency                                                                         | `lib/registration/payment-utils.ts`                   |
| getEventUrl                                                                            | `lib/event-utils.ts`                                  |
| CancelButton component                                                                 | `app/event/.../components/cancel-button.tsx`          |
| RegistrationCountdown component                                                        | `app/event/.../components/registration-countdown.tsx` |
| ReviewStep, PaymentStep, CompleteStep constants                                        | `lib/registration/registration-reducer.ts`            |
| useAuth hook                                                                           | `lib/auth-context.tsx`                                |
| API routes (all exist)                                                                 | `app/api/payments/` (all 5 routes)                    |

## Docker Compose: Fix Stripe CLI Auth (Note: this is DONE)

The Stripe CLI container currently requires interactive `stripe login` on every restart. Fix by passing the API key directly.

**Modify `docker-compose.yml`:**

```yaml
stripe:
  image: stripe/stripe-cli:v1.34.0
  environment:
    STRIPE_DEVICE_NAME: docker
    STRIPE_API_KEY: ${STRIPE_API_KEY}
  command: listen --api-key ${STRIPE_API_KEY} --forward-to api:3333/stripe/webhook/clover/
  restart: unless-stopped
  depends_on:
    - api
```

The `STRIPE_API_KEY` env var follows the same pattern as `MYSQL_ROOT_PASSWORD` — set in the shell environment or a root `.env` file. Use the test secret key: `sk_test_51SbNR497k1U0PDK8Tox...` (same as `apps/api/.env.development:STRIPE_SECRET_KEY`).

**Note:** The `--api-key` flag also outputs a webhook signing secret on startup. If it differs from the hardcoded `STRIPE_WEBHOOK_SECRET` in `apps/api/.env.development`, we may need to update that value or capture the CLI output. We'll verify this during implementation.

## E2E Testing Strategy

With the Stripe CLI fix above, full payment e2e tests become viable. The approach:

1. **Payment page test** — navigate through reserve → register → review → payment, verify PaymentElement iframe renders with correct amount
2. **Full payment flow** (when Stripe CLI is running) — fill test card `4242 4242 4242 4242` in the Stripe iframe, submit, wait for redirect to complete page, verify "Payment Complete" message
3. **Complete page status variants** — unit tests cover all status rendering (succeeded, processing, requires_action, requires_payment_method, error)

E2e payment tests will be added as part of Phase 4.9 (already planned in the master plan). This phase focuses on unit tests for the payment UI components.

## Verification

1. `pnpm --filter public-next test` — all new + existing tests pass
2. `pnpm --filter public-next typecheck` — no type errors
3. `pnpm --filter public-next lint` — no lint errors
4. `pnpm --filter public-next build` — standalone build succeeds
5. Rebuild container, then manual browser test at `http://localhost:3200`:
   - Register for a paid event → review → payment page renders with correct amount
   - PaymentElement loads (Stripe iframe visible)
   - If Stripe CLI is running: complete full payment with test card `4242 4242 4242 4242`
