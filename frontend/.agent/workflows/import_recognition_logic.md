# Fast Import Recognition Logic (Zero Breakage)

To eliminate fragile relative paths like `../../../../` in diverse directory structures, follow this logic:

## 1. The Strategy: Absolute Aliasing
Instead of traversing folders, use a central anchor `@/` that resolves to the root `src/` of the module.

### How to Implement Fast:
- **Backend**: Use `@/` for `backend/src/`.
- **Frontend**: Use `@/` for `frontend/src/`.
- **Cross-Workspace**: Use `@backend/` and `@frontend/` from the root.

## 2. Fast Fix Logic (The "Levelizer")
If you find yourself writing more than one `../`, stop and apply this:

1. **Identify Module root**: Where is the nearest `tsconfig.json`?
2. **Calculate Distance**: If file is at `a/b/c/d/file.ts` and target is at `a/x/service.ts`, the relative path is `../../../x/service.ts`.
3. **The Alias Fix**:
   - Check if `@/` is mapped to `src/`.
   - Replace the entire relative prefix with `@/`.
   - Result: `import { ... } from "@/x/service.ts"`.

## 3. Automation Rule
Every time a folder is moved, the agent must trigger a `grep` search for `../../` to verify if relative links broken. If found, they MUST be converted to `@/` aliases to prevent future breaks.

> "Relative paths are for neighbors, Aliases are for the community." ✅
