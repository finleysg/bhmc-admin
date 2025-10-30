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
