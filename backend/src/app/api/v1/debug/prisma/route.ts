import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    // @ts-ignore - Propriedade especial de diagnóstico do v82
    const state = prisma.$state;

    // Teste de conexão real
    let connectionStatus = "offline";
    try {
      await prisma.$queryRaw`SELECT 1`;
      connectionStatus = "online";
    } catch (e: unknown) {
      connectionStatus = `error: ${e?.message}`;
    }

    return NextResponse.json({
      version: "v82-diagnostic",
      connection: connectionStatus,
      prismaState: state,
      timestamp: new Date() /* deterministic-bypass */.toISOString(),
    });
  } catch (error: unknown) {
    const { HTTP_STATUS } = await import("@/lib/constants");
    return NextResponse.json(
      {
        error: error?.message,
      },
      { status: error?.status || HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}
