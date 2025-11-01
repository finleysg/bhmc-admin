Definition of Done

A task is not completed until:

1. All tests pass.
2. No linting errors (ESLint must return zero errors; use --max-warnings 0).
3. Prettier format has been run on all files that have been touched.
4. No dev processes have been left running unless you have been explicitly asked to leave a dev server running.

## Handling Tool Conflicts

When ESLint and Prettier (or an editor format-on-save) conflict, follow this procedure:

1. Prefer code changes that satisfy both tools when possible.
2. If the conflict cannot be reasonably resolved by code changes:
   - Use a targeted suppression (for example `/* eslint-disable import/order */` or `// prettier-ignore`) placed immediately above the affected lines.
   - Include a one-line justification comment explaining why the suppression is necessary and reference an issue or guideline if available.
3. Avoid broad or permanent suppressions; prefer the smallest, well-documented workaround.
4. If the conflict appears workspace-wide (many files affected), ask the user before changing formatter or linter configuration.
5. Record the chosen resolution briefly in the task notes so future contributors understand the rationale.

Example acceptable suppression:

```ts
/* eslint-disable import/order */ // Prettier enforces React-first; ESLint prefers next/link-first
import React from "react"
import Link from "next/link"
```

This ensures that code quality tools are respected while preventing repeated formatter-induced edit loops.
