# Product Context

Problem:

- Site operators need an administrative interface to manage tournaments, participants, and
  schedules.
- Current system splits frontend (React) and backend (Django); adding an admin surface should
  integrate without disrupting existing flows.

Target users:

- Tournament administrators and club staff responsible for event setup and reporting.

Core capabilities (minimal scaffold):

- Browse and edit tournament metadata
- Manage players and pairings
- Trigger and view syncs with Golf Genius (integration points documented later)

Success criteria (scaffold phase):

- Monorepo established with clear apps and shared DTOs
- Dockerized databases available for local development
- Minimal app shells that can be extended quickly
