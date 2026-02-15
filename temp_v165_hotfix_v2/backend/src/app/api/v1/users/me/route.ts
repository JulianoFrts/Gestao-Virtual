import { getCurrentSession } from "@/lib/auth/session";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";
import { NextResponse } from "next/server";

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  try {
    const session = await getCurrentSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const userRepo = new PrismaUserRepository();
    const auditRepo = new PrismaSystemAuditRepository();
    const userService = new UserService(userRepo, auditRepo);

    // getProfile já busca dados aninhados e calcula permissões/flags de UI
    const profile = await userService.getProfile(userId);

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Error in /users/me:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
