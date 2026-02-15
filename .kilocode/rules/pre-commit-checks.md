# Pre-commit Checks

Before any git commit, you MUST verify:

1. Run `npm test` - all tests must pass
2. Run `npm run lint` - no errors allowed

If either fails, fix the issues before committing.

## Rationale

The Constitution requires compliance verification. Automated checks prevent non-compliant code from entering the repository.
