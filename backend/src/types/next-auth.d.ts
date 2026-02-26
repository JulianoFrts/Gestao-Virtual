import { Role, AccountStatus } from "@prisma/client";
import { DefaultSession } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: AccountStatus;
      companyId?: string | null;
      projectId?: string | null;
      siteId?: string | null;
      hierarchyLevel?: number;
      permissions?: Record<string, boolean>;
      ui?: Record<string, boolean>;
      isSystemAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    status: AccountStatus;
    companyId?: string | null;
    projectId?: string | null;
    siteId?: string | null;
    hierarchyLevel?: number;
    isSystemAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
    companyId?: string | null;
    projectId?: string | null;
    siteId?: string | null;
    hierarchyLevel?: number;
    permissions?: Record<string, boolean>;
    ui?: Record<string, boolean>;
    isSystemAdmin?: boolean;
  }
}
