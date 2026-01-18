# CLAUDE.md

## API (nestjs)

This project is responsible for three primary functions:

1. administrative actions (requires admin user)
2. user registration flow (requires authenticated user)
3. Stripe integration (payments and refunds)

### Patterns

- **Barrel Exports**: Each module exports public API via `index.ts`
- **Domain-Driven Design**: Service/controller/DTO layers per module
- **TypeScript**: Strict mode, no `any` in production code
- **Configuration**: .env files validated with Joi
- **Database**: API uses Drizzle ORM (external schema - no migrations)

## Naming Conventions

| Layer      | File                               | Class                            |
| ---------- | ---------------------------------- | -------------------------------- |
| Controller | `admin-registration.controller.ts` | `AdminRegistrationController`    |
| Service    | `admin-registration.service.ts`    | `AdminRegistrationService`       |
| Repository | `registration.repository.ts`       | `RegistrationRepository`         |
| Error      | `registration.errors.ts`           | `SlotConflictError`              |
| Mapper     | `mappers.ts`                       | `toPlayer()`, `toRegistration()` |

### Data Flow

```
Controller → Service → Repository → Drizzle
     ↓           ↓           ↓
   DTO      Domain Type    Row Type
```

- **Repositories**: Accept/return row types or primitives, throw `Error` on not found
- **Services**: Accept/return domain types, throw `HttpException` subclasses
- **Mappers**: `to{DomainType}(row)` functions bridge rows → domain types
