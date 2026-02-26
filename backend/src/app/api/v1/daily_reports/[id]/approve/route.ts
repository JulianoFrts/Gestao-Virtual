import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const dailyReportService = ProductionFactory.createDailyReportService();

export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    const user = await requireAuth();

    // Validar se o usuário tem permissão para aprovar (ex: role admin ou supervisor)
    // Para simplificar agora, permitiremos se autenticado, mas o ideal é checar role.
    // O requireAuth já garante que está logado.

    const report = await dailyReportService.approveReport(id, user.id);

    logger.info("Relatório aprovado", { reportId: id, approvedBy: user.id });

    return ApiResponse.json(report, "Relatório aprovado com sucesso");
  } catch (error) {
    logger.error("Erro ao aprovar relatório", { reportId: id, error });
    return handleApiError(error);
  }
}
