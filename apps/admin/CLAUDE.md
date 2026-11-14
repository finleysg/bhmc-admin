# CLAUDE.md

## Web Admin (next.js)

This project defines the UX for player and club administration + reporting.

### Patterns

- **Data fetching**: Plain `fetch` + `useState`/`useEffect` (no React Query)
- **Forms**: `useReducer` for complex state (no form library)
- **State**: React Context for auth, local state otherwise
- **Styling**: shadcn/ui + Tailwind v4, matching the public site's look and feel, with a jade primary ([ADR 0002](../../docs/adr/0002-admin-ui-matches-public-site.md)). Any new screen, and any existing screen you touch, uses shadcn components from `@/components/shadcn` (add more with `pnpm dlx shadcn add <name>`). Legacy screens still use daisyUI 5 and `app/components/ui`. Don't write new daisyUI code.
- **API**: Routes in `/app/api/` proxy to backend with Django tokens

### Auth

- **Credentials**: email and password protected accounts, owned by the Django backend
- **Roles**: Django auth groups, enforced by the API ([ADR 0003](../../docs/adr/0003-admin-roles.md))
  - Event Admin and Club Admin — either one admits a user to the admin site
  - Superusers hold every role
