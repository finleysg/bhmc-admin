# BHMC Club Administration

Bunker Hills Men's Club runs a season of golf events that members register for, play, and get paid out from. This glossary covers the language of administering the club and its events.

## Roles

**Event Admin**:
A club leader permitted to configure events and operate them through registration, preparation, results, closeout, and payouts.
_Avoid_: Staff, superuser

**Club Admin**:
A club leader permitted to maintain club-wide content and records that are not tied to a single event, such as documents, photos, announcements, and membership.
_Avoid_: Staff, superuser

## Event setup

**Season**:
The calendar year of events the club runs, identified by its year.

**Season Roll-forward**:
Creating a new season's events from the previous season's events, with dates moved to the new year and adjusted before creation.
_Avoid_: Copy event, clone, season import

**Fee Type**:
A kind of charge, such as a cart fee or skins, that an event can offer.

**Event Fee**:
The amount a specific event charges for a fee type.

**Session**:
A named, capacity-limited registration option within an event, with its own fee amounts, used by weekend majors that need it.

## Registration

**Registration Slot**:
One player position in an event's starting order (a tee time or shotgun hole and group position) that a player can occupy.
_Avoid_: Spot

**Slot Status**:
Where a slot is in its life: Available, Pending (held during signup), Payment Processing, Reserved (occupied by a registered player), or Unavailable (blocked by the club).

## Readiness

**Readiness**:
Whether an event is correctly prepared for a given milestone, expressed as a set of findings.
_Avoid_: Event status (which means Scheduled/Tentative/Canceled)

**Finding**:
A single readiness problem stating what is wrong, why it matters, and how to fix it; either blocking or a warning.

**Ready to Open Registration**:
The readiness milestone an event must pass before its signup opens.

**Ready to Play**:
The readiness milestone an event must pass between registration closing and play.

## Results and closeout

**Challenge Period**:
The informal window (about a day) after results are published during which players can dispute them.

**Close (an event)**:
Declaring an event's results final after the challenge period, which confirms its payouts.
_Avoid_: Confirm results, complete (which refers to the Golf Genius step)

## Payouts

**Payout**:
An amount a player won in an event and is owed.

**Credit Payout**:
A payout paid into the player's account in the pro shop's own system.

**Cash Payout**:
A payout paid in cash in an envelope; for events, only skins are paid this way.
_Avoid_: Skins payout (when the payment method is what matters)

**Pending**:
The state of a payout imported from results that are not yet final.

**Confirmed**:
The state of a payout whose event has been closed, so it can now be posted or delivered.

**Posted**:
The final state of a credit payout: the pro shop has entered it in their system.
_Avoid_: Paid

**Delivered**:
The final state of a cash payout: the envelope is at the pro shop ready for the player to pick up. Pickup is not tracked.
_Avoid_: Paid
