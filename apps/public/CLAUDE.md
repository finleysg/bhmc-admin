# CLAUDE.md

## Public Web (react spa)

This is the user facing website for club members.

### Patterns

- **Data fetching**: Tanstack Query
- **Forms**: React Hook Form
- **State**: React Context for registration and authentication
- **Styling**: Bootstrap v5 + custom SCSS
- **Multiple Backends**
  - apiUrl() to talk to the Django backend
  - serverUrl() to talk to the nestjs api for registration flows
- **Types**: zod used to validate api data
- **Classes**:
  - classes used to transform snake_case from Django to camelCase
  - class methods consolidate functional methods

### Testing

This project uses vitest for testing.

Use a flat test structure. No nested `describe` and `it` aliases. Example:

```typescript
test("test data is generated correctly", () => {
	const slots = buildTeetimeSlots(1, 1, 5, 5)
	const result = RegistrationSlotApiSchema.safeParse(slots[0])
	if (!result.success) {
		console.error(result.error.message)
	}
	expect(result.success).toBe(true)
})
```

Strive for high coverage of functional code.

If you create UX component tests, do not test implementation details. Test from the point of view of
a user of a component.

To run a single test file:

```bash
npx vitest run src/components/buttons/__tests__/register-button.test.tsx
```
