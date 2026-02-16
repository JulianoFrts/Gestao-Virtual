import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { HTTP_STATUS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  // Proteção simples: exige uma chave secreta via Header ou Query Param para ver o status real
  const authHeader = request.headers.get("x-health-token");
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const secret = process.env.APP_SECRET;

  if (!secret || (authHeader !== secret && token !== secret)) {
    return ApiResponse.json({ status: "ok" }); // Retorna 200 OK por padrão
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return ApiResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return ApiResponse.errorJson(
      "Unhealthy: Database disconnected",
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      [String(error)],
      "DATABASE_ERROR"
    );
  }
}
