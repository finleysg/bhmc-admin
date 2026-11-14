# Admin UI uses shadcn and Tailwind to match the public site, with a jade primary

Status: accepted

The admin app was built with daisyUI. The public site (`apps/public-next`) uses shadcn/ui on Tailwind v4, with its own design tokens and the Montserrat (headings) and Open Sans (body) fonts. As the admin is rebuilt slice by slice, every new screen, and every existing screen we touch, moves to shadcn/Tailwind and copies the public site's look and feel. The only intended difference is the color scheme: admin uses **jade** as its primary (and for ring and header) and **neutral slate** as its secondary. All other tokens are the public site's values.

Components are copied into the admin with the shadcn CLI (`apps/admin/components.json`). They are not shared through a workspace package. Copying is how shadcn is meant to be used, and it leaves public-next untouched. The cost is that the two copies can drift. Both apps use the same `new-york` style, so `pnpm dlx shadcn add <name>` in `apps/admin` produces matching components.

## Consequences

- shadcn components live in `apps/admin/app/components/shadcn` (import from `@/components/shadcn/...`). `app/components/ui` is the legacy daisyUI component set. It is deleted once nothing imports it.
- daisyUI stays installed until the last legacy screen is migrated. Its `corporate` and `business` themes are overridden so they use the same jade primary and slate secondary, and untouched screens don't clash with new ones.
- Color utilities such as `text-primary`, `bg-secondary`, and `text-accent` now resolve to shadcn tokens, even on legacy screens. In shadcn, `accent` is a pale hover surface, not a brand color. Don't use it for text color. daisyUI component classes (`btn-primary`, `badge-accent`) still read daisyUI's theme values.
- Dark mode still follows the admin's `data-theme` toggle: `business` is dark. The `dark:` variant is bound to `[data-theme="business"]`.
- Token changes on the public site are not picked up automatically. Copy them into `apps/admin/app/global.css` by hand.
