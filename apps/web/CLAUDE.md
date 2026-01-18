# CLAUDE.md

## Web Admin (next.js)

This project defines the UX for player and club administration + reporting.

### Patterns

- **Data fetching**: Plain `fetch` + `useState`/`useEffect` (no React Query)
- **Forms**: `useReducer` for complex state (no form library)
- **State**: React Context for auth, local state otherwise
- **Styling**: Tailwind v4 + daisyUI 5 utility classes
- **API**: Routes in `/app/api/` proxy to backend with Django tokens

### Auth

- **Credentials**: email and password protected accounts, owned by the Django backend
- **Roles**: roles defined in Django
  - Admin
  - Super Admin (no use cases yet)
