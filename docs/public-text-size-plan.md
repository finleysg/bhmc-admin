# Public website text-size preference

Branch: `feat/public-text-size`

Status: implemented; backend-dependent visual acceptance checks remain pending.

## Intended behavior

Visitors can choose Standard (100%), Larger (125%), or Largest (150%) using a
visible Text size control. The default appearance stays the same. The preference
applies throughout the public website, works without signing in, and persists in
the same browser across visits. Browser font preferences and zoom remain usable.

This change is limited to `apps/public-next`. It needs no database schema, API,
account settings, or new dependencies. Cross-device preference syncing is outside
this implementation.

## Implementation sequence

### 1. Define the preference and initial rendering

- Add a small `lib/text-size.ts` module with the allowed values, validation, and
  storage key (`bhmc-text-size`). Store named values rather than arbitrary CSS.
- Apply the selection using `data-text-size` on the document root.
- Extend the early initialization script in `app/layout.tsx` to restore a valid
  saved selection before the page paints. Preserve the existing theme behavior.
- Treat missing or invalid values as Standard. Catch storage access errors so
  restricted storage never prevents rendering or changing size for the session.
- Keep the bootstrap and interactive control's accepted values consistent, and
  avoid hydration warnings or a flash of the default size on reload.

### 2. Add the control

- Add `app/components/text-size-control.tsx` as a client component.
- Compose the existing Button and DropdownMenu radio components; read their
  current shadcn documentation before implementing. Display a Text size label
  and a selected indicator for Standard, Larger, and Largest.
- Integrate it into `app/components/header.tsx` next to the existing preferences.
  Keep the label discoverable on mobile; allow the header to wrap or use another
  row at narrow widths instead of hiding the feature behind an unlabeled icon.
- Update the document root immediately when a choice is made, then save it.
  Synchronize the visible selection with the root after hydration and with
  storage events from other tabs, including removal of the saved preference.
- Preserve keyboard navigation, visible focus, accessible naming, and return of
  focus to the trigger after closing the menu. Standard provides the reset action.

### 3. Scale typography and review affected layouts

- In `app/global.css`, apply a text-scale multiplier to Tailwind typography tokens,
  body text, markdown, and custom text sizes. Keep the root font size and layout
  spacing unchanged. Browser font preferences still apply through rem units.
- Cards may grow taller as text wraps, but their widths and padding stay stable.
  Avoid CSS transforms or CSS zoom.
- Replace the fixed `text-[10px]` results badge with a relative size.
- Review scorecard geometry: text currently uses rem but cells and scoring marks
  use fixed pixel widths. Scale those dimensions appropriately and preserve
  readable score notation. Allow local horizontal scrolling for wide scorecards.
- Check header, sidebar, dialogs, forms, tabs, calendar entries, registration slot
  rows, and results for clipping, inaccessible controls, and excessive truncation.
  Change fixed sizing or wrapping only where needed for this feature.
- Ensure portaled menus and dialogs inherit the selected scale. Inspect embedded
  Stripe payment controls separately because root styles do not reach iframes;
  use supported appearance options if needed and verify browser zoom still works.

## Validation and acceptance

Add focused behavioral coverage for selecting a size, restoring it on reload,
resetting to Standard, invalid saved values, and unavailable storage. Verify the
initialization path agrees with the control. Use browser checks for visual layout
and keyboard behavior rather than relying on DOM-only tests to prove readability.

Review desktop and narrow mobile layouts at all three sizes, in light and dark
themes, for both signed-out and signed-in navigation. Cover the home page, event
details, calendar, registration/reservation, payment, member results, scorecards,
and a dialog. Include long names and event titles where available.

Acceptance criteria:

- The default layout remains visually consistent with the current site.
- The preference changes immediately and survives navigation and reload.
- A saved preference applies before the first visible render.
- The control remains discoverable and keyboard accessible at the largest size.
- Text and controls do not overlap or become inaccessible at supported sizes.
- At Standard, browser zoom to 200% preserves content and functionality; also
  check larger browser default fonts and the combined Largest-plus-zoom case.
- Narrow layouts reflow without page-wide horizontal overflow; inherently wide
  tables and scorecards can scroll within their own regions.
- No new hydration or browser console errors occur.

After implementation, run the repository-required checks and resolve failures:

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build
docker compose build public-next
```

If verifying the running Docker app, recreate only its service after the build
with `docker compose up -d --no-deps public-next`. Rebuild any shared UI package
if implementation ends up modifying one; the current plan uses local components.

## Estimated scope

Approximately one developer day, with up to a second day for responsive layout
fixes and verification. The likely core changes are the preference helper, control,
header, root layout, and global stylesheet, plus focused tests and layout fixes
identified during browser review. The main uncertainty is crowded registration,
calendar, scorecard, and embedded payment layouts at larger sizes.

## Implementation verification

- Added the three-size header menu, early restoration, browser persistence,
  blocked-storage handling, and synchronization between tabs.
- Scaled scorecard dimensions and the fixed-size results badge.
- Moved payment context hooks out of Next.js route layouts to resolve existing
  production type errors; updated their consumers and tests.
- Formatting, lint, and all 469 tests pass. Production compilation passes using
  `pnpm --filter public-next exec next build --webpack`. The default Turbopack
  builder encounters a worker-process permission error in this environment.
- Repository type checking passes. The public-next Docker image was rebuilt successfully.
- Browser verification confirmed Largest renders at 24px, persists on reload,
  and fits a 375px viewport in the backend-error fallback.
- Production browser checks passed for all three sizes at 1280px and 375px on
  the sign-in page: preferences survive reload, there is no page-wide overflow,
  and no browser page errors occurred.
- Backend-dependent pages and Stripe iframe sizing still require visual review
  with working services and payment data. The site preference scales host-page
  typography; embedded Stripe content retains its own styling.

### Follow-up local Docker verification

Started mysql, backend, api, and public-next successfully. The home page loads
real backend data with HTTP 200. All three text sizes persist after reload on
both desktop and mobile. Real content exposed a mobile grid overflow; explicit
single-column tracks and min-width constraints resolved it at all three sizes.

The normal Turbopack production build passes inside Docker with
`docker compose exec -T -e NODE_ENV=production public-next pnpm build`.
The earlier permission failure was limited to host execution. Formatting, lint,
tests, and type checking pass after the grid fix. Authenticated flows and Stripe
still need visual coverage; the backend itself is now running and available.

### Text-only scaling correction

Replaced root font scaling with scaled typography tokens. The points page now
uses constrained grid columns so table overflow stays within its card. Browser
checks at 1280px and 375px confirmed identical card widths for Standard, Larger,
and Largest, with body text at 16px, 20px, and 24px and no page-wide overflow.
