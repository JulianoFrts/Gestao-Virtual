---
name: workspace-hygiene
description: Routine for maintaining a standardized and clean workspace.
---

# Workspace Hygiene Skill

Use this skill to ensure the project structure remains organized and adheres to defined standards.

## Standard Layout
1. **Root**: Config files only. No logs, scripts, or zips.
2. **Tools**: All automation and test scripts.
3. **Archives**: All non-essential historical data (logs, debug dumps).
4. **Docs**: Architectural and project guidance.

## Maintenance Routine (The "Maiko" Routine)
Whenever finishing a significant change or starting a new day:
1. **Identify**: Find any new `.log`, `.txt`, `.zip`, or temporary scripts.
2. **Move**:
    - Build/Audit logs -> `archives/logs/`
    - Debug text files -> `archives/debug/`
    - Backups/Zips -> `archives/zips/`
    - New scripts -> `tools/`
3. **Format**: Check that file naming follows kebab-case or camelCase as appropriate.
4. **Cleanup**: Permanently delete files that serve no future purpose (intermediate debug states).

## Standardization Checklist
- [ ] Are all scripts inside `tools/` or `scripts/`?
- [ ] Is the root directory free of output files?
- [ ] Are logs correctly archived in `archives/`?
- [ ] Is `package.json` synchronized across workspaces?

> "Evoluir sempre, organizar sempre." ✅
