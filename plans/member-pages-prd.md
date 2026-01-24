# PRD: Member Pages Consolidation

## Problem Statement

Member-specific pages (my-account, my-activity, my-scores) are scattered with inconsistent routing (`/my-*` pattern), no unified entry point, and missing features. Members cannot view their tournament results/points, scores lack tee info and export, and activity page conflates friends with event history.

## Solution

Consolidate all member pages under `/member/*` route with a hub page dispatching to sub-routes. Rename/restructure existing pages, add new My Results page, enhance My Scores with tee display and Excel export.

### Route Structure
```
/member           → Hub page (card grid menu)
/member/account   → Profile (renamed from my-account)
/member/friends   → Friend management (was my-activity, stripped down)
/member/scores    → Scores with filters + export (enhanced my-scores)
/member/results   → NEW: Tournament results, points, registrations
```

## User Stories

1. As a member, I want a single menu entry for all my personal pages, so I can easily find member features
2. As a member, I want a hub page showing all member sections, so I can navigate to what I need
3. As a member, I want to see my tournament results by season, so I can track my competitive performance
4. As a member, I want to see my season-long points for each event, so I can track my standings
5. As a member, I want pending registrations shown alongside completed results, so I see my full event participation
6. As a member, I want results visually distinct per event (not a flat table), so I can scan my history
7. As a member, I want to see my scores across all seasons, so I can review my full history
8. As a member, I want to filter scores by course, so I can focus on specific course performance
9. As a member, I want to see which tee I played for each round, so I have complete round context
10. As a member, I want to export my scores to Excel, so I can analyze offline or share
11. As a member, I want friend management on a dedicated page, so it's not mixed with other activity
12. As a member, I want the sidebar to link to `/member` hub, so navigation is consistent
13. As a member, I want the user dropdown to link to `/member` hub, so I can access my pages quickly
14. As a member, I want hub cards to easily navigate to a specific page
15. As a member, I want my profile picture and name displayed prominently on the hub, so I have a personalized experience
16. As a member, I want to update my profile picture from the hub via an edit icon, so I don't need to navigate elsewhere

## Implementation Decisions

### Routing
- Add `/member` parent route rendering `MemberHub` component
- Child routes: `/member/account`, `/member/friends`, `/member/scores`, `/member/results`
- Redirect legacy `/my-account`, `/my-activity`, `/my-scores/*` to new routes

### Member Hub Page

**Page Title:** "My Pages"

**Layout**
```
┌──────────────────────────────────────────────────────────────────────┐
│ MY PAGES                                                             │
├──────────────────────────────────────────────────────────────────────┤
│                          ┌───────────┐                               │
│                          │   (pic)   │  ✎                            │
│                          └───────────┘                               │
│                           John Smith                                 │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 👤 Account  │  │ 👥 Friends  │  │ 📊 Scores    │  │ 🏆 Results  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Profile Header (top section)**
- Profile picture centered, prominent
- Player name displayed below photo
- Edit icon (pencil) positioned to right of photo
- Click edit icon → photo picker modal
- Default image shown if no profile picture exists
- Reuses existing `ProfileImage` responsive picture pattern and `useUploadPhoto` hook

**Navigation Cards (bottom section)**
- Card grid layout (similar to event hub pattern)
- Cards: Account, Friends, Scores, Results
- Each card shows icon, title, brief description
- Link cards navigate to respective sub-routes

### My Results Page

**Layout**
```
┌─────────────────────────────────────────────────────────────────┐
│ MY RESULTS                               Season: [2024 ▼]       │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🕐 Upcoming Major #4                                Aug 5   │ │
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │ │
│ │ Registered • Waiting for results                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Major Tournament #3                                Jul 15   │ │
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │ │
│ │ SCORES                                                      │ │
│ │   Gross: 78                                                 │ │
│ │   Net: 71                                                   │ │
│ │                                                             │ │
│ │ POINTS                                                      │ │
│ │   Gross: 12 pts (5th)                                       │ │
│ │   Net: 18 pts  (T2nd)                                       │ │
│ │                                                             │ │
│ │ PRO SHOP CREDIT                                             │ │
│ │   $45.00 – Second place net                        ● Paid   │ │
│ │   $20.00 – Third place gross                  ○ Confirmed   │ │
│ │                                                             │ │
│ │ SKINS                                                       │ │
│ │   $30.00 – Net birdie on #4, #12                   ● Paid   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Wednesday Weekday                                   Jul 10  │ │
│ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │ │
│ │ SCORES                                                      │ │
│ │   Gross: 82                                                 | | 
| |   Net: 74                                                   │ │
│ │ POINTS                                                      │ │
│ │   Gross: 5 pts (12th)                                       | |
| |   Net: 8 pts (6th)                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Structure**
- Season selector at top (default: current season)
- Events as cards, sorted chronologically (newest first)
- Pending registered events interspersed by date with "Waiting for results" status

**Each event card shows (vertical sections, no columns):**
1. **SCORES** – Gross score+position, Net score+position
2. **POINTS** – Gross points, Net points
3. **PRO SHOP CREDIT** (only if player won) – Amount, description (e.g. "Second place net"), payout status
4. **SKINS** (only if player won) – Amount, description (e.g. "Net birdie on #4"), payout status

**Payout status badges:** ● Paid, ◐ Confirmed, ○ Pending

**Data model:**
- Each event has multiple Tournament records (gross stroke, net stroke, skins)
- Tournament has `is_net` boolean and `format` field ("Stroke", "Skins", etc.)
- Player has TournamentResult per tournament: position, score, amount, payout_status, summary, details
- Player has TournamentPoints per tournament: points earned
- Credits = non-skins TournamentResults where amount > 0
- Skins = TournamentResults where tournament.format === "Skins"

**Data sources:** registration-slots, tournament-results, tournament-points APIs

### My Scores Enhancement

**Layout**
```
+-------------------------------------------------------------------------+
| MY SCORES                                                               |
+-------------------------------------------------------------------------+
| Season: [2025 v]     Courses: [Bunker Hills x] [Keller x] [+ Add]       |
|                                                      [Export to Excel]  |
+-------------------------------------------------------------------------+
|                                                                         |
| West                                                                    |
| +---------------------------------------------------------------------+ |
| | Date                      | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Tot | |
| |---------------------------+---+---+---+---+---+---+---+---+---+-----| |
| | 2025-04-09 (Gold) Gross   | 5 | 4 | 5 | 3 | 6 | 4 | 5 | 4 | 5 |  44 | |
| | 2025-04-09 (Gold) Net     | 4 | 4 | 5 | 3 | 5 | 4 | 5 | 3 | 5 |  40 | |
| |---------------------------+---+---+---+---+---+---+---+---+---+-----| |
| | 2025-04-02 (Gold) Gross   | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 5 |  44 | |
| | 2025-04-02 (Gold) Net     | 3 | 5 | 4 | 4 | 4 | 5 | 4 | 3 | 5 |  40 | |
| |---------------------------+---+---+---+---+---+---+---+---+---+-----| |
| | Average                   |4.5|4.5|4.5|3.5|5.5|4.5|4.5|4.0|5.0| 44  | |
| | Best Ball                 | 4 | 4 | 4 | 3 | 5 | 4 | 4 | 3 | 5 |  36 | |
| +---------------------------------------------------------------------+ |
|                                                                         |
| East                                                                    |
| +---------------------------------------------------------------------+ |
| | Date                      | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Tot | |
| |---------------------------+---+---+---+---+---+---+---+---+---+-----| |
| | 2025-04-23 (White) Gross  | 4 | 3 | 4 | 3 | 3 | 4 | 5 | 3 | 7 |  37 | |
| | 2025-04-23 (White) Net    | 3 | 3 | 4 | 3 | 2 | 4 | 5 | 2 | 7 |  34 | |
| |---------------------------+---+---+---+---+---+---+---+---+---+-----| |
| | Average                   |4.0|3.0|4.0|3.0|3.0|4.0|5.0|3.0|7.0| 37  | |
| | Best Ball                 | 4 | 3 | 4 | 3 | 3 | 4 | 5 | 3 | 7 |  36 | |
| +---------------------------------------------------------------------+ |
|                                                                         |
+-------------------------------------------------------------------------+
```

**Filters**

Season Dropdown:
- Options: "All Seasons" + list of seasons with data (newest first)
- Default: Current season
- Single-select

Course Filter (Chip/Tag Selection):
- Clickable chips for each course the player has rounds at
- Click chip to toggle selection on/off
- Selected chips shown first, then "+ Add" button to see unselected
- When no courses selected: show all courses (no filter applied)
- Default: All courses (no chips selected)

**Display**

Grouping:
- Scores grouped by course (course name as section header with colored background)
- Sections ordered alphabetically by course name
- Within each section: rounds sorted by date descending (newest first)

Row Format:
- Each round produces TWO rows: Gross row, then Net row immediately below
- Date cell format: `YYYY-MM-DD (Tee) Gross` or `YYYY-MM-DD (Tee) Net`
- Gross and net are separate PlayerRound records, grouped by date+tee
- Hole cells show individual hole scores (1-9 for front nine display)
- Final column shows 9-hole total
- Cell highlighting for scoring: birdie (green), par (white), bogey (tan), double+ (orange)

Summary Rows:
- At bottom of each course section: Average row and Best Ball row
- Average: per-hole averages across all Gross rows for that course
- Best Ball: best score per hole across all Gross rows for that course

**Export**

Button:
- Location: Top right, inline with filter controls
- Label: "Export to Excel" (or download icon + "Export")
- Disabled when no scores match filters

Excel Output:
- Filename: `my-scores-{season}.xlsx` (or `my-scores-all-seasons.xlsx`)
- Single worksheet
- Columns: Date, Tee, Type (Gross/Net), Course, Holes 1-9, Total
- One row per PlayerRound record (raw data only, no summary rows)
- Sorted same as display: by course, then by date descending
- Client-side library (xlsx or similar)

**States**

Empty: "No scores found for the selected filters"

Loading: Skeleton/shimmer for table, filters remain interactive

### My Friends Page
- Extract MyFriends component from current account-settings
- Full page layout instead of column
- Same functionality: view friends, add/remove via star toggle

### My Account Page
- Remove profile picture display and edit (moved to hub)
- Keep PlayerInfo and PlayerPassword components
- Route moves from `/my-account` to `/member/account`

### Navigation Changes
- Sidebar: Replace "My Scores" link with "Member" → `/member`
- User menu: Replace individual links with "My Pages" → `/member`

### API Changes
- Django: Add player filter to `TournamentResultViewSet.get_queryset()`
- Django: Create `TournamentPointsViewSet` if not exists, with player filter
- Django: Both need season filter support
- Update TournamentResultSerializer to match current model fields (remove points/is_net, add amount, payout_type, flight, etc.)

## Testing Decisions

### Good Test Characteristics
- Test external behavior from user perspective
- Mock API responses with MSW
- No testing of implementation details (state, internal functions)

### Modules to Test
1. MemberHub - renders all cards, links navigate correctly
2. MyResults - displays results by event, handles empty state, season filter works
3. MyScores (enhanced) - filter interactions, export triggers download
4. Route redirects - legacy routes redirect to new paths

### Prior Art
- `apps/public/src/__tests__/account.test.tsx` - authenticated user page tests
- `apps/public/src/test/test-utils.tsx` - setupAuthenticatedUser pattern
- MSW handlers for mocking API responses

## Out of Scope

- Login history or audit trail
- Notification preferences
- Messaging/communication features
- Redesigning individual result record display (use existing patterns)
- Changing how results/points are imported (Golf Genius integration)
- Mobile app considerations

## Further Notes

### Existing File Locations
- `apps/public/src/screens/account/` - current member screens
- `apps/public/src/components/account/` - my-events, my-friends components
- `apps/public/src/components/points/my-points.tsx` - points display
- `apps/public/src/hooks/use-player-scores.ts` - scores data fetching
- `apps/public/src/models/scores.ts` - PlayerRound includes tee data
- `backend/events/views.py` - TournamentResultViewSet
- `backend/events/serializers.py` - TournamentResultSerializer (needs update)

### Data Available
- Tournament results: id, tournament, player, flight, position, score, amount, payout_type, payout_to, payout_status, team_id, summary, details
- Tournament points: id, tournament, player, position, score, points, details, create_date
- Player scores: includes tee.name via PlayerRound class

### Questions
None - scope is well-defined.
