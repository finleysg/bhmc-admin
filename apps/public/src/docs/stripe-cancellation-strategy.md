# Stripe Payment Cancellation Strategy

## The Challenge

When users cancel a payment while awaiting `stripe.confirmPayment()`, we face a fundamental
limitation: **Stripe's `confirmPayment` method cannot be directly cancelled**. The call to Stripe's
servers continues even if the user cancels on our end.

## Our Solution: Cancellation Token Pattern

We implement a cancellation token pattern that allows us to:

1. Mark operations as cancelled
2. Ignore results from cancelled operations
3. Prevent UI updates from cancelled operations
4. Clean up properly regardless of Stripe's state

## Implementation Details

### 1. Cancellation Tracking

```typescript
const abortControllerRef = useRef<AbortController | null>(null)
const paymentOperationRef = useRef<{ cancelled: boolean }>({ cancelled: false })
```

- `abortControllerRef`: Used for cancelling our own network requests
- `paymentOperationRef`: Tracks whether the current payment operation has been cancelled

### 2. Cancellation Checkpoints

We check for cancellation at strategic points throughout the payment flow:

```typescript
// Before starting
if (operationTracker.cancelled) return

// After validation
if (operationTracker.cancelled) return

// After payment intent creation
if (operationTracker.cancelled) return

// CRITICAL: After Stripe confirmation (even though call completed)
if (operationTracker.cancelled) {
  console.log("Ignoring Stripe result - operation was cancelled")
  return
}
```

### 3. The Stripe `confirmPayment` Dilemma

```typescript
// This call CANNOT be cancelled once started
const { error: confirmError } = await stripe!.confirmPayment({...})

// But we can ignore its result if cancelled
if (operationTracker.cancelled) {
  console.log("Payment operation was cancelled - ignoring Stripe confirmation result")
  return
}
```

**Key Insight**: The Stripe payment may still be processed on their servers, but we don't proceed
with our local registration completion if cancelled.

### 4. Force Cancel Implementation

```typescript
const handleForceCancel = async () => {
  // Mark operation as cancelled
  if (paymentOperationRef.current) {
    paymentOperationRef.current.cancelled = true
  }

  // Abort network requests
  if (abortControllerRef.current) {
    abortControllerRef.current.abort()
  }

  // Clean up server state
  await cancelRegistration("user", mode)
  handlePaymentCanceled()
}
```

## What Happens During Cancellation

### Scenario 1: User Cancels Before Stripe Call

✅ **Clean cancellation** - No Stripe interaction occurs

- Payment validation stops
- UI resets immediately
- No server-side payment processing

### Scenario 2: User Cancels During Stripe Call

⚠️ **Partial cancellation** - Stripe call continues but result is ignored

- Stripe may still process the payment
- Our app ignores the confirmation result
- User's registration is cancelled
- UI resets immediately

### Scenario 3: Automatic Timeout

🔄 **Automatic recovery** - Same as Scenario 2

- Timeout triggers after 2 minutes
- Current operation marked as cancelled
- UI automatically recovers

## Important Considerations

### 1. Payment Status Ambiguity

When cancelling during a Stripe call, there's a window where:

- User sees "cancelled" in our UI
- Payment might still process at Stripe
- Registration is cancelled in our system

**Mitigation**: We provide clear messaging about checking bank statements.

### 2. Double Payment Prevention

If a payment did process after cancellation:

- User's registration was cancelled
- They would need to re-register
- Our duplicate detection should prevent double charges

### 3. User Communication

We provide clear messaging:

```typescript
setError(
  new Error(
    "Payment processing timed out. This may be due to network issues or bank verification delays. " +
      "Please check if the payment was processed in your bank account before trying again.",
  ),
)
```

## Race Condition Handling

### The Critical Race

```
User clicks cancel → Stripe.confirmPayment() completes → Our cancellation code runs
```

**Solution**: We always check cancellation status after async operations:

```typescript
const { error: confirmError } = await confirmPaymentPromise

// CRITICAL: Check cancellation AFTER Stripe call
if (operationTracker.cancelled) {
  // Ignore result, don't complete registration
  return
}
```

### Cleanup Strategy

```typescript
finally {
  // Only clean up if not cancelled (cancelled ops handle their own cleanup)
  if (!operationTracker.cancelled) {
    buttonRef.current.disabled = false
    setIsBusy(false)
    // ... other cleanup
  }

  // Always clear refs
  abortControllerRef.current = null
  paymentOperationRef.current = { cancelled: false }
}
```

## User Experience Benefits

1. **Immediate Response**: Users see immediate feedback when cancelling
2. **No Stuck States**: Automatic timeout prevents permanent stuck states
3. **Clear Communication**: Users understand what happened and next steps
4. **Safe Cancellation**: Can cancel without corrupting application state

## Limitations & Trade-offs

### What We Can't Do

- Cancel in-flight Stripe network requests
- Prevent Stripe from processing payments that are already submitted
- Guarantee no payment occurred after cancellation

### What We Can Do

- Prevent our app from completing the registration
- Clean up our application state immediately
- Provide clear feedback about what might have happened
- Maintain data consistency in our system

## Testing Scenarios

### Manual Testing

1. **Cancel during validation**: Should stop immediately
2. **Cancel during intent creation**: Should stop after current network call
3. **Cancel during Stripe processing**: Should ignore Stripe result
4. **Network throttling**: Simulate slow connections to test timeout

### Edge Cases

1. **Multiple rapid cancellations**: Should be idempotent
2. **Cancel after success**: Should be no-op
3. **Component unmount during processing**: Should clean up properly

This approach provides the best possible cancellation experience within the constraints of the
Stripe API, ensuring users are never permanently stuck while maintaining data consistency.
