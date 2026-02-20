---
trigger: always_on
---

# Architectural Standards

- **SOLID & Clean Code**: Every piece of code must adhere to SOLID principles and Clean Code best practices.
- **Domain-Driven Design (DDD)**: Maintain clear boundaries between modules and domains. Use repositories and services to isolate business logic.
- **Zero Relative Paths Policy**: Eliminate fragile relative imports (e.g., `../../../../`). MANDATORY use of path aliases (`@/`) for all cross-module imports and test files. This ensures fast folder recognition and prevents breakage during refactoring.
- **Backend-First Logic**: The Backend is the source of truth for business logic, complex filtering, and security. The Frontend should remain as thin as possible, delegating heavy lifting and sensitive decisions to the API.
- **Code Refactoring**: Proactively refactor messy code to maintain system fluidity and organization.
