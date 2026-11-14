# Admin screens read with Server Components and write with Server Actions

Status: accepted

The admin app was written as client components that fetch in `useEffect` and track loading, error, data, and submitting flags in `useState`. Forms copy their props into one `useState` per field, hand-roll dirty tracking and validation, and are reset by changing their `key`. That code is long, races when responses arrive out of order, waterfalls requests through the browser, and loses list filters on navigation.

As screens are added or touched (alongside [ADR 0002](0002-admin-ui-matches-public-site.md)), they follow these defaults:

- **Reads happen in Server Components.** Pages are async server components that call the NestJS API through `lib/server-api.ts`, which forwards the `access_token` cookie. Independent requests run in parallel. A 404 becomes `notFound()`; a missing or rejected token redirects to sign-in, and a 403 to `/restricted`.
- **Filter and search state lives in the URL.** Pages read `searchParams`. A small client component updates the URL (debounced for typing) inside a transition. Back and forward work, searches can be shared, and stale responses cannot overwrite newer ones.
- **Writes are Server Actions.** Forms are uncontrolled (`defaultValue`, `name`) and submit to a Server Action through `useActionState`, which supplies the pending flag and the returned result. The action validates `FormData` with zod, calls the API, and calls `revalidatePath` so the page re-renders with fresh data. It returns a status, a message, and field errors. Forms submit with `onSubmit` → `startTransition(() => formAction(new FormData(form)))` rather than the `action` prop: React resets a form after an `action`-prop submission, which would discard typed values on a validation error and return Radix checkboxes and selects to their mount-time values.
- **Client components are the interactive leaves:** inputs that update the URL, forms using `useActionState`, dialogs. `useEffect` is for synchronising with something outside React, never for fetching.

The NestJS API remains the authority on validation and permissions. zod in an action gives field-level messages before the round trip; it does not replace API checks. react-hook-form is reserved for genuinely complex client forms (dynamic field arrays, cross-field rules) where `useActionState` falls short.

## Consequences

- Server Actions are plain async functions, so they are unit-tested directly with `fetch`, `next/headers`, and `next/cache` mocked. Component tests cover rendering and wiring, not data flow.
- Pages no longer need `useAuth()` checks for signed-in state: `proxy.ts` redirects requests without a token, and `lib/server-api.ts` redirects on a rejected one.
- Existing screens keep their client-side fetching until they are touched. The Next.js route handlers in `app/api/` remain for those screens and for file downloads.
- Club player management (`app/club/players`) is the reference implementation.
