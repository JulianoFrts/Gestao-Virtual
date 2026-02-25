import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { ProductionFactory } from "@/modules/production/application/production.factory";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const dailyReportService = ProductionFactory.createDailyReportService();

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const user = await authSession.requirePermission(
      "daily_reports.list",
      request,
    );
    const { companyId: userCompanyId } = user as any;

    const report = await dailyReportService.getReportById(id);

    if (!report) {
      return ApiResponse.notFound("Relatório não encontrado");
    }

    // Validação de Escopo: Verificar se o relatório pertence à empresa do usuário
    if (
      (report as any).companyId !== userCompanyId &&
      !authSession.isGlobalAdmin(
        (user as any).role,
        (user as any).hierarchyLevel,
        (user as any).permissions,
      )
    ) {
      return ApiResponse.forbidden("Você não tem acesso a este relatório");
    }

    return ApiResponse.json(report);
  } catch (error) {
    logger.error("Erro ao buscar relatório", { reportId: id, error });
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const user = await authSession.requirePermission(
      "daily_reports.create",
      request,
    );
    const { companyId: userCompanyId } = user as any;

    // Primeiro verifica se o relatório existe e pertence à mesma empresa
    const existingReport = await dailyReportService.getReportById(id);
    if (!existingReport)
      return ApiResponse.notFound("Relatório não encontrado");

    if (
      (existingReport as any).companyId !== userCompanyId &&
      !authSession.isGlobalAdmin(
        (user as any).role,
        (user as any).hierarchyLevel,
        (user as any).permissions,
      )
    ) {
      return ApiResponse.forbidden(
        "Não autorizado a alterar dados de outra empresa",
      );
    }

    const body = await request.json();
    const report = await dailyReportService.updateReport(id, body);

    return ApiResponse.json(report);
  } catch (error) {
    logger.error("Erro ao atualizar relatório (PUT)", { reportId: id, error });
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const user = await authSession.requirePermission(
      "daily_reports.create",
      request,
    );
    const { companyId: userCompanyId } = user as any;

    // Primeiro verifica se o relatório existe e pertence à mesma empresa
    const existingReport = await dailyReportService.getReportById(id);
    if (!existingReport)
      return ApiResponse.notFound("Relatório não encontrado");

    if (
      (existingReport as any).companyId !== userCompanyId &&
      !authSession.isGlobalAdmin(
        (user as any).role,
        (user as any).hierarchyLevel,
        (user as any).permissions,
      )
    ) {
      return ApiResponse.forbidden(
        "Não autorizado a alterar dados de outra empresa",
      );
    }

    const body = await request.json();
    const report = await dailyReportService.updateReport(id, body);

    return ApiResponse.json(report);
  } catch (error) {
    logger.error("Erro ao atualizar relatório (PATCH)", {
      reportId: id,
      error,
    });
    return handleApiError(error);
  }
}
