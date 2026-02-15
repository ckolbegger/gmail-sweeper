# No `any` Type

Avoid using the `any` type in TypeScript code:

```typescript
// ✗ Wrong
const data: any = getData();
function process(item: any): void { }

// ✓ Correct
const data: Email[] = getData();
function process(item: Email): void { }
```

If you must use `any` (e.g., for untyped external libraries), use `unknown` instead and narrow the type:

```typescript
// ✓ Acceptable
const data: unknown = getData();
if (Array.isArray(data)) {
  // data is now known[]
}
```

## Rationale

The `any` type bypasses TypeScript's type safety. The project uses strict mode (`noImplicitAny` in tsconfig.json).
