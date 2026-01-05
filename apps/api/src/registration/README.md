# Registration Module

Handles event registration, slot reservations, payments, and real-time updates.

## User Endpoints

### Registration

| Method | Path                            | Description                       |
| ------ | ------------------------------- | --------------------------------- |
| POST   | `/registration`                 | Reserve slots for an event        |
| GET    | `/registration/:id`             | Get registration by ID            |
| PUT    | `/registration/:id/cancel`      | Cancel registration               |
| PATCH  | `/registration/:id`             | Update notes                      |
| PATCH  | `/registration/slots/:id`       | Update slot player assignment     |
| PUT    | `/registration/:id/add-players` | Add players to registration group |

### Payments

| Method | Path                           | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/payments`                    | Create payment record          |
| PUT    | `/payments/:id`                | Update payment details         |
| POST   | `/payments/:id/payment-intent` | Create Stripe PaymentIntent    |
| POST   | `/payments/customer-session`   | Create Stripe customer session |
| GET    | `/payments/:id/stripe-amount`  | Get amount in cents with fees  |

## SSE Live Updates

Real-time registration updates via Server-Sent Events.

### Endpoint

```
GET /registration/:eventId/live
```

### Connecting (JavaScript)

```javascript
const eventSource = new EventSource("/api/registration/123/live")

eventSource.addEventListener("update", (event) => {
	const data = JSON.parse(event.data)
	console.log("Slots updated:", data.slots)
	console.log("Current wave:", data.currentWave)
})

eventSource.addEventListener("heartbeat", () => {
	// Connection alive - no action needed
})

eventSource.addEventListener("error", (event) => {
	console.error("Stream error:", JSON.parse(event.data))
})

// Handle connection errors
eventSource.onerror = () => {
	eventSource.close()
	// Reconnect after delay
	setTimeout(() => connectSSE(), 5000)
}
```

### Message Types

| Type        | Description            | Data                      |
| ----------- | ---------------------- | ------------------------- |
| `update`    | Slot state changed     | `RegistrationUpdateEvent` |
| `heartbeat` | Keep-alive (every 30s) | Empty                     |
| `error`     | Stream error           | `{ error: string }`       |

### Update Event Payload

```typescript
{
  eventId: number
  slots: [{
    id: number
    status: 'A' | 'P' | 'R' | 'W' | 'C'  // Available, Pending, Reserved, etc.
    player: { id, firstName, lastName, email } | null
    hole: { id, holeNumber } | null
    wave?: { wave: number, isOpen: boolean, opens: string }
  }]
  currentWave: number
  timestamp: string  // ISO date
}
```

### Behavior

- **Debounced**: Updates batched with 2s delay
- **Wave tracking**: Emits update when priority wave changes
- **Auto-cleanup**: Stream resources freed 5 min after last subscriber disconnects
