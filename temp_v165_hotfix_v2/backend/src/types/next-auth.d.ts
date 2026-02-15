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
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    status: AccountStatus;
    companyId?: string | null;
    projectId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
    companyId?: string | null;
    projectId?: string | null;
  }
}
