import { ApiResponse, handleApiError } from "@/lib/utils/api";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const user = await requireAdmin();

    const criticalRoutes = [
      "/api/v1/users",
      "/api/v1/auth/session",
      "/api/v1/projects",
      "/api/v1/teams",
      "/api/v1/production/tower-status",
      "/api/v1/audit/architectural",
    ];

    const results = await checkRoutesHealth(criticalRoutes, user.id);

    return ApiResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}

async function checkRoutesHealth(routes: string[], userId: string) {
  return Promise.all(
    routes.map((route) => checkSingleRouteHealth(route, userId)),
  );
}

async function checkSingleRouteHealth(route: string, userId: string) {
  const start = Date.now();
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://127.0.0.1:3000";
    const response = await fetch(`${baseUrl}${route}`, {
      method: "HEAD",
      headers: { "x-internal-check": "true" },
    });

    const latency = Date.now() - start;

    let status = response.ok ? "UP" : "DOWN";
    if (response.status === 401 || response.status === 403) {
      status = "SECURE";
    } else if (!response.ok && response.status < 500) {
      status = "UNSTABLE";
    }

    const result = {
      route,
      status,
      latency: `${latency}ms`,
      code: response.status,
      message:
        response.statusText ||
        (status === "SECURE"
          ? "Protegido (Autenticado)"
          : status === "UP"
            ? "Operacional"
            : "Erro na rota"),
    };

    await (prisma as any).routeHealthHistory.create({
      data: {
        route: result.route,
        status: result.status,
        latency: result.latency,
        code: result.code,
        message: result.message,
        performerId: userId,
      },
    });

    return result;
  } catch (error: any) {
    const latency = Date.now() - start;
    const resultError = {
      route,
      status: "DOWN" as const,
      latency: `${latency}ms`,
      code: 500,
      message: error.message || "Erro de conexão fatal",
    };

    await (prisma as any).routeHealthHistory.create({
      data: {
        route: resultError.route,
        status: resultError.status,
        latency: resultError.latency,
        code: resultError.code,
        message: resultError.message,
        performerId: userId,
      },
    });

    return resultError;
  }
}
