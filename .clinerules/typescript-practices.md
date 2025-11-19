# TypeScript Practices

Purpose: Document TypeScript conventions and pragmatic workarounds for this workspace so
contributors follow consistent patterns.

Guiding principles

- Prefer installing official type packages (`@types/*`) or using libraries that ship with types.
- Prefer typed alternatives when available. If a dependency lacks types and a well-maintained typed
  alternative exists, prefer the alternative.
- Avoid creating ambient `.d.ts` files in the repository. Ambient declarations hide issues and make
  maintenance harder.
- For unavoidable third-party type gaps, prefer local `@ts-ignore` or `@ts-expect-error` inline
  comments at the use site rather than adding `.d.ts` files.

When to use each option

- Install `@types/*`: when DefinitelyTyped provides types for the dependency.
- Use `@ts-ignore` / `@ts-expect-error`: when a specific import or call site triggers a type error
  that is non-actionable and the usage is well-scoped.
  - Add a short comment explaining why the ignore is safe and reference an issue or upstream PR if
    applicable.
- Create `.d.ts` files: explicitly disallowed by workspace policy. If you believe a `.d.ts` is
  necessary, open an issue and obtain explicit approval from a maintainer before adding one.

Recommended workflow for missing types

1. Search for `@types/<pkg>` and official type support.
2. If not available, prefer:
   - Use dynamic require with an inline `@ts-ignore` (for node-only utilities).
   - Wrap the untyped module behind a small typed adapter in the consuming package, with local `any`
     used only within the adapter.
3. If the missing types significantly block development, create a ticket proposing either:
   - Contributing types to DefinitelyTyped,
   - Replacing the dependency, or
   - Approving a single, well-documented `.d.ts` under strict review (rare).

Documentation & PR requirements

- Any use of `@ts-ignore` must include a one-line justification in the same file.
- PRs that add `.d.ts` files will be rejected unless there is an approved issue referencing the
  change.
- Update `techContext.md` when a new workspace-wide TypeScript convention is adopted.

## Handling Auto-Formatter Conflicts

When an auto-formatter repeatedly removes or modifies imports:

1. Check if the import is actually being used in the code
2. If the formatter persists in removing it, consider:
   - Adding a `// eslint-disable-next-line` comment if it's an ESLint issue
   - Checking if there's a conflicting Prettier or editor setting
   - Using a different import pattern that the formatter accepts
3. Do NOT repeatedly attempt the same import pattern if it fails 3+ times
4. Ask the user for guidance on formatter configuration

Rationale

- Keeps the codebase maintainable and reduces hidden type-surface area.
- Encourages contributors to prefer typed solutions or narrowly-scoped, documented workarounds.

## Type-First Development

Always define interfaces and types before implementing functions that use them. Use `TODO: Define types` comments if types are unclear initially.

**Good Pattern:**

```typescript
interface TournamentAggregate {
	id: string
	name: string
	format: TournamentFormat
	// ... specific properties
}

function processTournament(aggregate: TournamentAggregate): Result {
	// Implementation
}
```

**Avoid:**

```typescript
function processTournament(aggregate: any): Result {
	// Implementation
	// TODO: Add types later
}
```

## Generic Parser Patterns

For parsers/transformers that work with different data shapes, use constrained generics instead of `any`.

**Good Pattern:**

```typescript
parsePlayerData<T extends { name?: string; points?: string }>(aggregate: T, memberCard: MemberCard) {
  return {
    playerName: aggregate.name || "Unknown",
    points: aggregate.points || "0",
    // ...
  }
}
```

**Avoid:**

```typescript
parsePlayerData(aggregate: any, memberCard: MemberCard) {
  // Implementation
}
```

## Raw Data Handling

When working with untyped data from external sources (database queries, API responses, etc.), prefer `Record<string, unknown>` over `any`.

**Good Pattern:**

```typescript
function mapToRegistration(data: {
	registration: Record<string, unknown>
	course: Record<string, unknown> | null
}) {
	return {
		// Safe cast: DB schema guarantees id is number
		id: data.registration.id as number,
		name: data.registration.name as string,
		// Cast with null check
		courseId: data.course ? (data.course.id as number) : null,
	}
}
```

**Avoid:**

```typescript
// Using any loses type safety
function mapToRegistration(data: { registration: any; course: any | null }) {
	return {
		id: data.registration.id, // No type checking
		name: data.registration.name,
		courseId: data.course?.id,
	}
}
```

**For Array Handling:**

```typescript
// Good: Typed array with Record<string, unknown> for untyped items
function mapSlots(
	rows: Array<{
		slot: Record<string, unknown>
		player: Record<string, unknown> | null
	}>,
) {
	return rows.map((row) => ({
		// Safe cast: Known DB schema
		slotId: row.slot.id as number,
		playerId: row.player ? (row.player.id as number) : null,
	}))
}
```

**Null Safety:**

When casting properties that might not exist, check for null/undefined first:

```typescript
// Good: Check before accessing
if (!data.eventFee || !data.feeType) continue
const fee = {
	eventFeeId: data.eventFee.id as number,
	feeTypeId: data.feeType.id as number,
}

// Avoid: Non-null assertion without checking
const fee = {
	eventFeeId: data.eventFee!.id as number, // Could be null
	feeTypeId: data.feeType!.id as number,
}
```

**Rationale:**

- `Record<string, unknown>` maintains type safety while acknowledging unknown structure
- Forces explicit casts with comments explaining safety
- ESLint catches `any | null` unions as redundant
- Prevents accidental `any` propagation through codebase

## Type Assertion Guidelines

Type assertions (`as Type`) are acceptable only when:

- Bridging legacy code with new types
- Working with external libraries that don't provide types
- ORM limitations (Drizzle, Prisma)
- Always include a comment explaining why the assertion is safe

**Acceptable:**

```typescript
// Drizzle ORM requires any for dynamic table references
const table = this.drizzle.db.table(tableName as any)
```

**Avoid:**

```typescript
const data = response as MyType // No explanation why this is safe
```

## Discriminated Unions for Variants

Use discriminated unions for related types that share a common discriminator field, especially for different variants of the same concept.

**Good Pattern:**

```typescript
type TournamentAggregate =
	| { format: "points"; points: string; rank: string; name: string }
	| { format: "skins"; total: string; purse: string; name: string }
	| { format: "proxy"; position: string; name: string }
	| { format: "stroke"; purse: string; position: string; name: string }

function processAggregate(aggregate: TournamentAggregate) {
	switch (aggregate.format) {
		case "points":
			return aggregate.points // TypeScript knows this exists
		case "skins":
			return aggregate.total // TypeScript knows this exists
		// ...
	}
}
```

## Utility Types for Common Patterns

Create and reuse utility types for common patterns like API responses, database results, and error handling.

**Recommended Utility Types:**

```typescript
type ApiResponse<T> = {
	data: T
	error?: string
	meta?: { total: number; page: number }
}

type DatabaseResult<T> = T | null

type ServiceResult<T> =
	| {
			success: true
			data: T
	  }
	| {
			success: false
			error: string
	  }
```

## Type Guards Over Assertions

Prefer type guards and `is` assertions over `as` assertions when possible. Type guards provide runtime safety.

**Good Pattern:**

```typescript
function isGGAggregate(obj: unknown): obj is GGAggregate {
	return typeof obj === "object" && obj !== null && "member_cards" in obj && "id" in obj
}

if (isGGAggregate(data)) {
	// TypeScript knows data is GGAggregate here
	return data.member_cards
}
```

**Avoid:**

```typescript
return (data as GGAggregate).member_cards // No runtime safety
```

## Interface Extension Strategy

Extend interfaces when the new type is a specialization of the base type. Create separate interfaces when they represent different concepts, even if they share properties.

**When to Extend:**

```typescript
interface BaseEntity {
	id: string
	createdAt: Date
}

interface User extends BaseEntity {
	email: string
	name: string
}
```

**When to Create Separate Interfaces:**

```typescript
interface ApiUser {
	id: string
	email: string
	name: string
}

interface DatabaseUser {
	id: string
	email: string
	name: string
	passwordHash: string // Not in API responses
}
```

## Strict TypeScript Configuration

All TypeScript projects must have strict configuration enabled:

**Required tsconfig.json settings:**

```json
{
	"compilerOptions": {
		"strict": true,
		"noImplicitAny": true,
		"strictNullChecks": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"exactOptionalPropertyTypes": true,
		"noImplicitReturns": true,
		"noFallthroughCasesInSwitch": true
	}
}
```

## Type Safety Priority Order

When implementing new features, follow this priority order:

1. **Define interfaces and types first**
2. **Use discriminated unions for variants**
3. **Implement with proper generic constraints**
4. **Add type guards for runtime safety**
5. **Use utility types for consistency**
6. **Only use type assertions as last resort with documentation**
