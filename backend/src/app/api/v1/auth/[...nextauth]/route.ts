/**
 * NextAuth API Route Handler (Auth.js v5)
 *
 * Endpoint: /api/v1/auth/[...nextauth]
 */

import { handlers } from "@/lib/auth/auth";

export const { GET, POST } = handlers;
