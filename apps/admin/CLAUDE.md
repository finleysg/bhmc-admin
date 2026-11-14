# CLAUDE.md

## Web Admin (next.js)

This project defines the UX for player and club administration + reporting.

### Patterns

New and touched screens follow [ADR 0005](../../docs/adr/0005-admin-server-components-and-actions.md); `app/club/players` is the reference implementation. Legacy screens still fetch in `useEffect` — don't copy them.

- **Reads**: async Server Components calling the API through `lib/server-api.ts` (forwards the `access_token` cookie). Run independent requests in parallel. No fetching in `useEffect`.
- **Filters/search**: in the URL (`searchParams`), updated by a small client component inside a transition.
- **Writes**: Server Actions (`actions.ts`, `"use server"`) validating `FormData` with zod, then `revalidatePath`. Forms are uncontrolled and use `useActionState`, submitting via `onSubmit` → `startTransition(() => formAction(formData))` (not the `action` prop, which resets the form).
- **Form layout**: shadcn `Field`, `FieldLabel`, `FieldError` (`data-invalid` on the Field, `aria-invalid` on the control); `orientation="horizontal"` for checkbox rows. Read-only record metadata uses `DetailList`/`DetailItem` from `@/components/detail-list`.
- **State**: `useState` only for UI-only state (an open dialog, a draft input). Derive everything else. React Context for auth.
- **Styling**: shadcn/ui + Tailwind v4, matching the public site's look and feel, with a jade primary ([ADR 0002](../../docs/adr/0002-admin-ui-matches-public-site.md)). Any new screen, and any existing screen you touch, uses shadcn components from `@/components/shadcn` (add more with `pnpm dlx shadcn add <name>`). The shadcn CLI now generates `import { cn } from "cn"` and adds the `cn` package; change the import to `@/lib/utils` and `pnpm remove cn` (we stay on clsx + tailwind-merge, like public-next, until `cn` reaches 1.0). Legacy screens still use daisyUI 5 and `app/components/ui`. Don't write new daisyUI code.
- **API**: Server code calls the API via `lib/server-api.ts`. Routes in `/app/api/` proxy to the backend with Django tokens for legacy client-side screens and file downloads.

### Auth

- **Credentials**: email and password protected accounts, owned by the Django backend
- **Roles**: Django auth groups, enforced by the API ([ADR 0003](../../docs/adr/0003-admin-roles.md))
  - Event Admin and Club Admin — either one admits a user to the admin site
  - Superusers hold every role
