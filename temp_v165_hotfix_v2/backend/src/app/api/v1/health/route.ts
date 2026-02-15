import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: NextRequest) {
  // Proteção simples: exige uma chave secreta via Header ou Query Param para ver o status real
  const authHeader = request.headers.get("x-health-token");
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const secret = process.env.APP_SECRET || "temp_secret_123";

  if (authHeader !== secret && token !== secret) {
    return NextResponse.json({ status: "ok" }, { status: 200 }); // Retorna algo genérico para curiosos
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: String(error),
      },
      { status: 503 },
    );
  }
}
