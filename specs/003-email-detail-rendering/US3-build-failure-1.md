# Bug: Build fails with TypeScript module resolution error

**Found by:** tui-exploratory-tester
**Target:** US3 — URL Cycling (exploratory testing attempt)
**Discovery:** Exploratory testing — build failure
**Severity:** critical

## Steps to Reproduce

1. Attempt to build the application with `npm run build`
2. Observe TypeScript compilation error:
   ```
   src/cli/components/email-detail.tsx(9,29): error TS2307: Cannot find module './hooks/use-keyboard.ts' or its corresponding type declarations.
   ```
3. Verify that `./hooks/use-keyboard.ts` file exists at `src/cli/hooks/use-keyboard.ts`
4. Verify that compiled output exists at `dist/cli/hooks/use-keyboard.js`

## Expected Behavior

The TypeScript compiler should successfully compile the source files and generate JavaScript output without errors.

## Actual Behavior

The build fails because TypeScript cannot resolve the module `./hooks/use-keyboard.ts` even though the file exists. The compilation error occurs during the `tsc` step before `tsc-alias` runs.

## Evidence

### File Structure (Source)

```bash
$ ls -la src/cli/hooks/
use-keyboard.ts      # File exists (103 lines)
use-smart-filter.ts  # File exists (143 lines)
```

### File Structure (Dist)

```bash
$ ls -la dist/cli/hooks/
use-keyboard.d.ts           # Type definitions exist
use-keyboard.d.ts.map
use-keyboard.js             # JavaScript compiled file exists
use-keyboard.js.map
```

### Compiled Import (Problematic)

The compiled `dist/cli/components/email-detail.js` contains:

```javascript
import { useKeyboard } from './hooks/use-keyboard.ts';
```

This should be:

```javascript
import { useKeyboard } from './hooks/use-keyboard.js';
```

### Build Error Output

```
> npm run build
> tsc && tsc-alias

src/cli/components/email-detail.tsx(9,29): error TS2307: Cannot find module './hooks/use-keyboard.ts' or its corresponding type declarations.
```

## Root Cause Analysis

The issue stems from a TypeScript module resolution problem with NodeNext configuration:

1. **tsconfig.json** uses `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`
2. TypeScript successfully compiles `use-keyboard.ts` to `use-keyboard.js` (verified by existence of compiled files)
3. However, TypeScript's resolution system cannot resolve the `.ts` import in the source file
4. The compiled JavaScript retains the `.ts` extension in the import statement instead of updating to `.js`

This suggests:

- The TypeScript compiler (tsc) is failing to resolve the module during compilation
- tsc-alias is also not fixing the import statement in the compiled output
- The error occurs before tsc-alias can run (npm script: `tsc && tsc-alias`)

## Relevant Files

- `src/cli/components/email-detail.tsx` (line 9): Import statement
- `src/cli/hooks/use-keyboard.ts`: Source file that doesn't compile properly
- `tsconfig.json`: TypeScript configuration
- `package.json`: Build scripts
- `dist/cli/components/email-detail.js`: Compiled output with problematic import

## Analysis

The TypeScript NodeNext module resolution system should automatically:

1. Compile `.ts` files to `.js`
2. Update import statements to reference `.js` instead of `.ts`

The fact that compilation appears to succeed (files are generated) but the import statement remains with `.ts` extension suggests:

1. **Missing type declaration**: The `use-keyboard.ts` file might not have proper type exports that TypeScript expects for NodeNext resolution
2. **Configuration mismatch**: The `moduleResolution: "NodeNext"` setting might require additional configuration for TypeScript to resolve relative paths correctly
3. **TypeScript version issue**: TypeScript 5.7.2 might have a bug or incompatibility with the current configuration

## Impact on US3 Testing

This build failure **completely blocks** exploratory testing of US3 (URL Cycling):

- Cannot start the TUI app
- Cannot navigate to emails with URLs
- Cannot test URL cycling shortcuts (u, U, c, o)
- Cannot test edge cases (no URLs, many URLs, rapid key presses)

## Recommended Fixes

1. **Check TypeScript version compatibility**: Verify TypeScript 5.7.2 is compatible with NodeNext module resolution
2. **Verify type exports**: Ensure `use-keyboard.ts` has proper exports for TypeScript resolution
3. **Check tsc-alias configuration**: Verify tsc-alias is properly configured to update imports
4. **Try alternative module resolution**: Consider changing `moduleResolution` from `"NodeNext"` to `"Node16"` or `"Bundler"`
5. **Test with cleaner build**: Remove all caches and run a complete rebuild
6. **Check for circular dependencies**: Verify there are no circular imports affecting resolution

## Status

**BLOCKED**: Cannot proceed with US3 exploratory testing until build is fixed.
