# Admin access uses Event Admin and Club Admin groups, with superusers passing every check

Status: accepted

Today the admin app admits only superusers, but the API's `@Admin()` check admits anyone with Django's staff flag. The two disagree. We replace both with two Django auth groups, **Event Admin** and **Club Admin** (ADR 0001 keeps roles in Django). Django's `/auth/users/me/` already returns a user's groups, so the API reads them from the token check it already makes. The API enforces a role on every admin endpoint. The admin app admits anyone who holds either role. Superusers pass every role check, so nobody is locked out while the groups are being filled. Both groups start empty, and members are added through club player management.

| Role        | Covers                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event Admin | Events, sessions, fees, Golf Genius, event player management and registration admin, event reports (including finance), readiness, roll-forward, registration inspector |
| Club Admin  | Membership and club players, documents, photos, announcements, club content and records, membership reports, Settings, role membership                                  |

## Consequences

- The staff flag no longer grants API access. The public site calls no staff-only endpoints, so it is unaffected.
- The existing "Tournament Admin" and "Paul Helpers" groups are left alone. Only Django admin's own permissions use them.
- Group names are matched exactly. Renaming a group in Django admin revokes the role.
- Treasurer and pro shop alert recipients are email addresses in Settings, not role holders.
