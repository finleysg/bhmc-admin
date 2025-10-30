# Debugging Loops

Purpose: Prevent infinite retry loops when something consistently fails, ensuring efficient
debugging and user experience.

## Recognition Criteria

When a tool use fails repeatedly with the same approach:

- Same tool used 3+ times with minimal variation
- Same error/result each time
- No new information between attempts

## Required Actions

1. **Stop after 3 failed attempts** with the same approach
2. **Ask the user** for guidance rather than retry
3. **Try a different approach** (e.g., write_to_file instead of replace_in_file)
4. **Check for external factors** (auto-formatters, linters, file locks)

## Examples

- ✗ Attempting same replace_in_file 10 times
- ✓ After 3 fails, switch to write_to_file or ask user
- ✓ After 3 fails, ask if there's a formatter issue

## Rationale

- Prevents wasting time and context window on futile attempts
- Forces consideration of alternative approaches
- Improves user experience by seeking guidance when stuck
- Encourages systematic debugging rather than brute force
