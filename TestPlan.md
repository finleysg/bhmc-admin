# Unit Test Plan: Add Player Feature

## 1. AddPlayerPage Reducer Tests

**File to create:** `apps/web/app/events/[eventId]/players/add/__tests__/reducer.test.ts`

**Source:** `apps/web/app/events/[eventId]/players/add/reducer.ts`

**Current coverage:** 0% (no tests exist)

### Test Structure

```
describe('AddPlayerReducer')
├── describe('SET actions')
│   ├── SET_EVENT - stores event, calls generateAdminRegistration
│   ├── SET_IS_LOADING
│   ├── SET_USER - sets signedUpBy
│   ├── SET_ERROR - handles Error, string, object types
│   ├── RESET_ERROR
│   └── SET_COMPLETE_SUCCESS
├── describe('choosable events')
│   ├── ADD_PLAYER - adds player, recalculates flags
│   ├── REMOVE_PLAYER - removes player, updates flags
│   ├── SELECT_SLOTS - updates selectedSlotGroup
│   └── SET_FEES - updates selectedFees
├── describe('non-choosable events')
│   ├── ADD_PLAYER - creates synthetic slots
│   ├── REMOVE_PLAYER - removes synthetic slots
│   └── SET_FEES
├── describe('generateAdminRegistration')
│   ├── returns null when canCompleteRegistration=false
│   ├── courseId derivation for choosable events
│   ├── courseId=null for non-choosable events
│   ├── fee mapping with multiple fees per player
│   └── player limiting to available slots
├── describe('UI flag calculations')
│   ├── canSelectGroup transitions
│   ├── canSelectFees transitions
│   └── canCompleteRegistration transitions
└── describe('SET_REGISTRATION_OPTIONS')
    └── updates options and regenerates adminRegistration
```

### Key Test Cases (16 total)

| # | Test | Priority |
|---|------|----------|
| 1 | SET_EVENT stores event and generates registration | High |
| 2 | SET_ERROR handles Error instance | High |
| 3 | SET_ERROR handles string | High |
| 4 | SET_ERROR handles object (JSON stringify) | Medium |
| 5 | ADD_PLAYER (choosable) - adds to selectedPlayers | High |
| 6 | ADD_PLAYER (non-choosable) - creates synthetic slot | High |
| 7 | REMOVE_PLAYER removes from selectedPlayers | High |
| 8 | SELECT_SLOTS updates selectedSlotGroup | High |
| 9 | SET_FEES updates selectedFees array | High |
| 10 | generateAdminRegistration returns null when incomplete | High |
| 11 | generateAdminRegistration finds courseId from holes | High |
| 12 | generateAdminRegistration limits players to slots | Medium |
| 13 | canSelectFees=true when slots selected (choosable) | Medium |
| 14 | canSelectFees=true when players exist (non-choosable) | Medium |
| 15 | canCompleteRegistration requires players + slots | High |
| 16 | SET_REGISTRATION_OPTIONS regenerates adminRegistration | Medium |

---

## 2. AdminRegistrationService Tests

**File to create:** `apps/api/src/registration/__tests__/admin-registration.service.test.ts`

**Source:** `apps/api/src/registration/services/admin-registration.service.ts`

**Current coverage:** 0% (no direct tests)

### Dependencies to Mock

- DrizzleService
- RegistrationRepository
- PaymentsRepository
- EventsService
- CoursesService
- DjangoAuthService
- MailService
- RegistrationBroadcastService

### Test Structure

```
describe('AdminRegistrationService')
├── describe('createAdminRegistration')
│   ├── describe('choosable events')
│   │   ├── creates registration with slots
│   │   ├── creates payment record
│   │   ├── inserts fees
│   │   ├── throws SlotConflictError when slots unavailable
│   │   └── sets payment code "Requested" vs "Waived"
│   └── describe('non-choosable events')
│       ├── creates synthetic slots
│       ├── throws EventFullError when at capacity
│       └── cleans up stale registrations
├── describe('sendAdminRegistrationNotification')
│   ├── sends payment request email
│   ├── resolves user from registration
│   └── throws when user not found
├── describe('updateMembershipStatus')
│   ├── updates player isMember flag
│   └── sets lastSeason
├── describe('getCompleteRegistrationAndPayment')
│   ├── returns hydrated registration and payment
│   ├── throws NotFoundException for missing registration
│   └── throws NotFoundException for missing payment
└── describe('convertSlots (private via createAdminRegistration)')
    ├── maps player IDs to players
    ├── calculates fee amounts via getAmount()
    └── handles multiple fees per player
```

### Key Test Cases (18 total)

| # | Test | Priority |
|---|------|----------|
| 1 | createAdminRegistration creates registration (choosable) | Critical |
| 2 | createAdminRegistration creates payment record | Critical |
| 3 | createAdminRegistration inserts slots with correct status | Critical |
| 4 | createAdminRegistration throws SlotConflictError | High |
| 5 | createAdminRegistration sets "Requested" payment code | High |
| 6 | createAdminRegistration sets "Waived" payment code | High |
| 7 | createAdminRegistration (non-choosable) creates registration | Critical |
| 8 | createAdminRegistration (non-choosable) throws EventFullError | High |
| 9 | createAdminRegistration handles SEASON_REGISTRATION | Medium |
| 10 | sendAdminRegistrationNotification sends email | High |
| 11 | sendAdminRegistrationNotification resolves user | High |
| 12 | sendAdminRegistrationNotification throws for missing user | Medium |
| 13 | updateMembershipStatus sets isMember=true | High |
| 14 | updateMembershipStatus sets lastSeason | High |
| 15 | getCompleteRegistrationAndPayment returns data | High |
| 16 | getCompleteRegistrationAndPayment throws for missing registration | Medium |
| 17 | getCompleteRegistrationAndPayment throws for missing payment | Medium |
| 18 | convertSlots calculates fee amounts correctly | High |

---

## 3. Stripe Webhook Service Test Gaps

**File:** `apps/api/src/stripe/__tests__/stripe-webhook.service.test.ts`

**Current coverage:** ~60 tests, but gaps exist

### Missing Tests to Add

```
describe('handlePaymentIntentFailed')
├── logs payment failure
└── handles missing metadata

describe('handlePaymentIntentSucceeded - edge cases')
├── metadata.registrationId is non-numeric string
├── metadata.registrationId has leading/trailing spaces
└── metadata object is undefined

describe('handleRefundCreated - edge cases')
├── very large refund amount
├── system user creation fails
└── createRefund throws exception

describe('handleRefundUpdated - edge cases')
└── confirmRefund throws exception

describe('email failure scenarios')
├── mail service throws during confirmation
├── mail service throws during refund notification
├── user not found for refund notification
└── event not found for notification
```

### Key Test Cases (12 total)

| # | Test | Priority |
|---|------|----------|
| 1 | handlePaymentIntentFailed logs failure | Medium |
| 2 | handlePaymentIntentSucceeded - non-numeric registrationId | High |
| 3 | handlePaymentIntentSucceeded - undefined metadata | High |
| 4 | handleRefundCreated - large amount conversion | Medium |
| 5 | handleRefundCreated - system user creation fails | High |
| 6 | handleRefundCreated - createRefund exception | High |
| 7 | handleRefundUpdated - confirmRefund exception | Medium |
| 8 | email failure - confirmation email throws | High |
| 9 | email failure - refund notification throws | High |
| 10 | email failure - user not found for refund | Medium |
| 11 | email failure - event not found | Medium |
| 12 | concurrent webhook idempotency | Low |

---

## Summary

| Area | New Tests | Priority |
|------|-----------|----------|
| AddPlayerPage Reducer | 16 | High |
| AdminRegistrationService | 18 | Critical |
| Stripe Webhook Service (gaps) | 12 | Medium |
| **Total** | **46** | |

## Verification

After implementing tests:
```bash
pnpm --filter web test -- --testPathPattern="add.*reducer"
pnpm --filter api test -- --testPathPattern="admin-registration.service"
pnpm --filter api test -- --testPathPattern="stripe-webhook"
```