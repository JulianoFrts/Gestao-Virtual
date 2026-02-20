---
trigger: always_on
---

# Workspace Organization & Standardization

## 1. Directory Structure Standards
All files must be placed in their appropriate directories to maintain a clean workspace. 

- **Root (`/`)**: Only core configuration files (`package.json`, `tsconfig.json`, `.gitignore`, `.env`, etc.) and project folders (`backend`, `frontend`, `docs`) should reside here.
- **Backend (`/backend`)**: Follows DDD/Clean Architecture.
- **Frontend (`/frontend`)**: Follows modular architecture.
- **Scripts (`/scripts` or `/tools`)**: All utility scripts (.js, .ps1, .py) must be moved here. DO NOT leave scripts at the root.
- **Documentation (`/docs`)**: All architectural plans, guides, and analysis.
- **Archives (`/archives`)**: 
    - `/archives/logs`: Build outputs, audit results, and logs.
    - `/archives/zips`: Legacy or backup zip files.
    - `/archives/debug`: Temporary debug files and text dumps.

## 2. Mandatory Cleanup Routine
After completing any task, the agent MUST:
1. **Delete** temporary debug files (e.g., `debug-*.ts`, `test-*.js`) that are no longer needed.
2. **Move** necessary logs or reports to `archives/logs`.
3. **Remove** zip files created for intermediate updates.
4. **Ensure** no hardcoded values or `.env` files are accidentally committed or left in redundant locations.

## 3. File Naming Conventions
- Scripts: Use camelCase or kebab-case (e.g., `generateOpenApi.ts` or `generate-openapi.ts`).
- Documentation: Use UPPERCASE for major artifacts (e.g., `INITIAL_ANALYSIS.md`) or kebab-case for guides.
- Temporary files: Must be prefixed with `tmp_` if they cannot be avoided.

## 4. Standardization Protocol
- **Linter**: Always run `npm run lint:fix` before finalizing.
- **Lockfiles**: Ensure `package-lock.json` is updated after any dependency change.
- **Workspaces**: Always use `-w backend` or `-w frontend` when running npm commands from the root to maintain isolation.
