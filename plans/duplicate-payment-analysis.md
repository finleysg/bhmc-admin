Root Cause: Duplicate Payment for Gary Schrank (Event 677)

What the data actually shows

There is one registration (44172) with two captured payments (30775 and 30789) attached to the same 3 slots
(130611, 130612, 130613). Each player has duplicate fee rows — one set tagged paymentId=30775, another tagged
paymentId=30789.

Critical timing:

- Reg 44172 createdDate: 22:16:30
- Payment 30775 PI created 22:15:26, captured 22:15:34
- Payment 30789 PI created 22:16:47, captured 22:16:51

The first payment was made 64 seconds before the surviving registration row even existed. Registration 44172
cannot be the one 30775 was paid against — there had to be an earlier registration X with the same slot IDs
that has since been hidden by setting userId=null.

How registration X got "released" while a Stripe PI was already captured

The cancel endpoint at apps/api/src/registration/services/registration.service.ts:362-389 (called via PUT
/api/registration/:id/cancel):

```typescript
if (paymentId) {
	await this.payments.deletePaymentAndFees(paymentId)
}
const canChoose = await this.events.isCanChooseHolesEvent(reg.eventId)
await this.slotCleanup.releaseSlotsByRegistration(registrationId, canChoose)
await this.repository.updateRegistration(registrationId, { userId: null, expires: null })
```

Three problems compound here:

1. No payment-state check. It releases slots and nulls userId regardless of whether the linked Stripe
   PaymentIntent is in flight (paymentCode != "pending") or already captured (confirmed=1).
2. Client passes paymentId: state.payment?.id ?? null
   (apps/public-next/lib/registration/registration-provider.tsx:316-327). When the React state has been reset
   (e.g. provider remount after navigating back to the event page from /complete), state.payment is null and
   paymentId is sent as null, so the API skips payment deletion but still releases slots and orphans the
   registration.
3. releaseSlots for choosable events (cleanup.service.ts:78-90) ignores current slot status. It will reset
   RESERVED slots (slots that were paid for) back to AVAILABLE and clear registrationId/playerId, making them
   re-pickable.

The same userId=null pattern exists in cleanupStaleRegistration (registration.service.ts:642-664). Both paths
produce a "ghost" registration that findRegistrationByUserAndEvent ignores, defeating the
duplicate-registration guard at reserveChoosableSlots:441-448.

Then the webhook quietly succeeds against a detached registration

When the PI 30775 webhook eventually fires, paymentConfirmed(X, 30775) (payments.service.ts:349-393) calls
findRegistrationSlotsByRegistrationId(X) — returns nothing because slots were already detached. It still
marks payment confirmed=1 and fee details isPaid=1, sends a confirmation email, and returns successfully. So
the captured charge is "successful" in our DB without any current slots/registration tied to it.

Most likely user flow

1. Gary registered, picked 5 slots, filled 3, hit Submit on the payment page (22:15:26 — slots →
   AWAITING_PAYMENT, payment 30775 stamped with PI).
2. Stripe captured at 22:15:34. Gary lands on /complete, sees success.
3. Webhook is briefly delayed.
4. Gary navigates somewhere that triggers the cancel endpoint (most likely a "Cancel" click on a re-entered
   flow, an expiry/navigation guard, or a back-button retry where state was already cleared so paymentId was
   sent as null).
5. Slots 130611–13 reset to AVAILABLE; reg X's userId set to null; payment 30775 untouched.
6. Webhook fires; payment 30775 silently marked confirmed against an empty registration.
7. Gary re-runs the registration (no AlreadyRegisteredError because reg X is now invisible to the duplicate
   check). Reg 44172 is created at 22:16:30 with the same 3 slots, payment 30789 is created and captured at
   22:16:47–51 — second $60 charge.

Recommended fix

Reject cancel (and gate cleanupStaleRegistration) when the linked registration has any payment whose
paymentCode != "pending" or confirmed=1. Don't release RESERVED slots. The deletePaymentsForRegistration
skip-condition at payments.service.ts:180 already encodes the right rule for payments — extend the same check
to the slot release / userId null-out steps so an in-flight or captured Stripe PI cannot be silently
abandoned. Also have the client send the linked paymentId reliably (e.g. fetch it from the registration if
state was lost) so the API can refuse the cancel rather than no-op the payment deletion.

Files involved:

- apps/api/src/registration/services/registration.service.ts:362-389 (cancel)
- apps/api/src/registration/services/registration.service.ts:642-664 (cleanupStaleRegistration)
- apps/api/src/registration/services/cleanup.service.ts:78-90 (releaseSlots ignores status)
- apps/api/src/registration/services/payments.service.ts:349-393 (paymentConfirmed succeeds against detached
  registration)
- apps/public-next/lib/registration/registration-provider.tsx:316-327 (cancel mutation passes possibly-null
  paymentId)
