import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProductionFactory } from "@/modules/production/application/production.factory";
import { API } from "@/lib/constants";

// DI
const dailyReportService = ProductionFactory.createDailyReportService();

const createDailyReportSchema = z
  .object({
    teamId: z.string().optional().or(z.string().nullable()),
    team_id: z.string().optional().nullable(),
    userId: z.string().optional(),
    user_id: z.string().optional().nullable(),
    companyId: z.string().optional(),
    company_id: z.string().optional().nullable(),
    reportDate: z.string().optional(),
    report_date: z.string().optional(),
    activities: z.string().default("Atividade sem descrição"),
    observations: z.string().optional().nullable(),
    localId: z.string().optional(),
    local_id: z.string().optional().nullable(),
    subPoint: z.string().optional().nullable(),
    sub_point: z.string().optional().nullable(),
    subPointType: z.string().optional().nullable(),
    sub_point_type: z.string().optional().nullable(),
    metadata: z.any().optional(),
    created_by: z.string().optional().nullable(),
    createdBy: z.string().optional().nullable(),
    synced_at: z.string().optional().nullable(),
  })
  .passthrough();

const querySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce
      .number()
      .min(1)
      .max(API.PAGINATION.MAX_LIMIT)
      .default(API.PAGINATION.DEFAULT_PAGE_SIZE),
  ),
  teamId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  userId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  startDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  endDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  status: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await authSession.requirePermission(
      "daily_reports.create",
    );

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      teamId: searchParams.get("teamId"),
      userId: searchParams.get("userId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      status: searchParams.get("status"),
    });

    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(
      currentUser.role,
      (currentUser as any).hierarchyLevel,
      (currentUser as any).permissions,
    );

    const result = await dailyReportService.listReports({
      ...query,
      isAdmin,
      companyId: (currentUser as any).companyId,
    });

    return ApiResponse.json(result);
  } catch (error) {
    logger.error("Erro ao listar relatórios", { error });
    return handleApiError(error, "src/app/api/v1/daily_reports/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authSession.requirePermission("daily_reports.create");
    const { companyId: userCompanyId } = user as any;

    const body = await request.json();
    logger.info("[daily_reports POST] Body received", {
      bodyKeys: Object.keys(body),
      activities: typeof body.activities,
      activitiesLen: body.activities?.length,
    });

    let rawData;
    try {
      rawData = createDailyReportSchema.parse(body);
    } catch (zodErr: any) {
      logger.error("[daily_reports POST] Zod validation failed", {
        issues: zodErr.issues,
        bodySnapshot: JSON.stringify(body).slice(
          0,
          API.LOGGING.MAX_LOG_SNAPSHOT,
        ),
      });
      throw zodErr;
    }

    // Mapeamento de campos garantindo segurança
    const cleanData: any = {
      reportDate: rawData.reportDate || rawData.report_date,
      activities: rawData.activities || "Atividade sem descrição",
      observations: rawData.observations || null,
      localId: rawData.localId || rawData.local_id || null,
      subPoint: rawData.subPoint || rawData.sub_point || null,
      subPointType: rawData.subPointType || rawData.sub_point_type || null,
      metadata: rawData.metadata || (body as any).metadata || {},
      createdBy: rawData.createdBy || rawData.created_by || (user as any).id,
      weather: rawData.weather || {},
      manpower: rawData.manpower || [],
      equipment: rawData.equipment || [],
      rdoNumber: rawData.rdoNumber || rawData.rdo_number || null,
      revision: rawData.revision || "0A",
      projectDeadline:
        rawData.projectDeadline || rawData.project_deadline
          ? Number(rawData.projectDeadline || rawData.project_deadline)
          : null,
      status: rawData.status || undefined, // Garantir que status seja enviado se existir
    };

    // Conectando relações explicitamente para evitar "Unknown argument userId" do Prisma
    const teamIdStr = rawData.teamId || rawData.team_id;
    if (teamIdStr) cleanData.team = { connect: { id: teamIdStr } };

    const userIdStr =
      rawData.userId ||
      rawData.user_id ||
      rawData.employeeId ||
      (user as any).id;
    if (userIdStr) cleanData.user = { connect: { id: userIdStr } };

    const companyIdStr =
      userCompanyId || rawData.companyId || rawData.company_id;

    // Validação de Escopo: Usuário comum só pode criar RDO para sua própria empresa
    await authSession.requireScope(companyIdStr, "COMPANY", request);

    if (companyIdStr) cleanData.company = { connect: { id: companyIdStr } };

    // Associar o usuário da sessão como o criador se não especificado
    if (!cleanData.createdBy) {
      cleanData.createdBy = (user as any).id;
    }

    // Helper function to remove undefined and null values
    const finalData = Object.fromEntries(
      Object.entries(cleanData).filter(([, v]) => v != null),
    );

    // Remove explicitly internal fields coming from frontend sync store
    // This is CRITICAL to prevent Prisma "Unknown argument" errors if legacy frontend sends these
    const fieldsToRemove = [
      "scheduledAt",
      "executedAt",
      "reviewedAt",
      "syncedAt",
      "id",
      "createdAt",
      "updatedAt",
      "scheduled_at",
      "executed_at",
      "reviewed_at",
    ];

    fieldsToRemove.forEach((field) => delete finalData[field]);

    const report = await dailyReportService.createReport(finalData);

    logger.info("Relatório criado", { reportId: report.id });

    return ApiResponse.created(report, "Relatório criado com sucesso");
  } catch (error) {
    logger.error("Erro ao criar relatório", { error });
    return handleApiError(error, "src/app/api/v1/daily_reports/route.ts#POST");
  }
}
