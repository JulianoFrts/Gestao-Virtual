# Dependency Management Policy

- **Evolve Always**: Always prioritize updating to the latest stable or LTS versions of all dependencies. Never downgrade versions ("não podemos fazer downgrade, temos que evoluir sempre!").
- **Zero Vulnerabilities**: Maintain an audit score of 0 vulnerabilities for high and critical levels. Regularly run `npm audit` to verify.
- **Workspace Sync**: Ensure versions are synchronized across the monorepo (Frontend and Backend) to avoid conflicts and redundancy.
- **Strict Cleanup**: Do not tolerate temporary, hotfix, or redundant directories (like `temp_*`). All code must be integrated into the core architecture.
- **Compatibility First**: Before upgrading, verify compatibility between major components (e.g., React, Next.js, Prisma, Three.js).
