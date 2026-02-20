# Security & Audit Protocols

- **Secret Protection**: Under no circumstances should secrets (API keys, Supabase keys, etc.) be hardcoded or committed to version control. Use `.env` files and secure secret managers.
- **Route Protection**: Every API route must be audited for "Broken Access Control". Explicit authentication (JWT/NextAuth) and authorization (e.g., `isGodRole`) guards are mandatory for non-public endpoints.
- **Service Audit**: Use the system auditing tools (like `SecurityAuditService`) to verify the health and security of the architecture regularly.
- **Audit Logs**: Maintain clear logs for administrative and critical system operations.
