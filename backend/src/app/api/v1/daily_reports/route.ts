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
    (schemaInput) => (schemaInput === null || schemaInput === "" ? undefined : schemaInput),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (schemaInput) => (schemaInput === null || schemaInput === "" ? undefined : schemaInput),
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
    .transform((text) => text || undefined),
  userId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((text) => text || undefined),
  startDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((text) => text || undefined),
  endDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((text) => text || undefined),
  status: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((text) => text || undefined),
});

export async function GET(request: NextRequest): Promise<Response> {
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
      currentUser.hierarchyLevel,
      currentUser.permissions as Record<string, boolean>,
    );

    const result = await dailyReportService.listReports({
      ...query,
      isAdmin,
      companyId: currentUser.companyId,
    } as unknown); // @fixme: provide correct type for listReports params

    return ApiResponse.json(result);
  } catch (error) {
    logger.error("Erro ao listar relatórios", { error });
    return handleApiError(error, "src/app/api/v1/daily_reports/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requirePermission("daily_reports.create");
    const { companyId: userCompanyId } = user;

    const body = await request.json();
    const rawData = validateDailyReportData(body);

    // Mapeamento de campos garantindo segurança
    const cleanData = mapDailyReportData(rawData as Record<string, unknown>, body, user.id);

    const companyIdStr = (userCompanyId || rawData.companyId || rawData.company_id) as string | undefined;
    await authSession.requireScope(companyIdStr, "COMPANY", request);

    if (companyIdStr) cleanData.company = { connect: { id: companyIdStr } };

    const finalData = finalizeReportData(cleanData);
    const report = await dailyReportService.createReport(finalData as unknown);

    logger.info("Relatório criado", { reportId: report.id });
    return ApiResponse.created(report, "Relatório criado com sucesso");
  } catch (error) {
    logger.error("Erro ao criar relatório", { error });
    return handleApiError(error, "src/app/api/v1/daily_reports/route.ts#POST");
  }
}

function validateDailyReportData(body: unknown): z.infer<typeof createDailyReportSchema> {
  try {
    return createDailyReportSchema.parse(body);
  } catch (error: unknown) {
    const zodErr = error as z.ZodError;
    logger.error("[daily_reports POST] Zod validation failed", {
      issues: zodErr.issues,
      bodySnapshot: JSON.stringify(body).slice(0, API.LOGGING.MAX_LOG_SNAPSHOT),
    });
    throw zodErr;
  }
}

function mapDailyReportData(
  rawData: Record<string, unknown>,
  body: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    reportDate: rawData.reportDate || rawData.report_date,
    activities: rawData.activities || "Atividade sem descrição",
    observations: rawData.observations || null,
    localId: rawData.localId || rawData.local_id || null,
    subPoint: rawData.subPoint || rawData.sub_point || null,
    subPointType: rawData.subPointType || rawData.sub_point_type || null,
    metadata: rawData.metadata || body.metadata || {},
    createdBy: rawData.createdBy || rawData.created_by || userId,
    weather: rawData.weather || {},
    manpower: rawData.manpower || [],
    equipment: rawData.equipment || [],
    rdoNumber: rawData.rdoNumber || rawData.rdo_number || null,
    revision: rawData.revision || "0A",
    projectDeadline:
      rawData.projectDeadline || rawData.project_deadline
        ? Number(rawData.projectDeadline || rawData.project_deadline)
        : null,
    status: rawData.status || undefined,
  };

  const teamIdStr = (rawData.teamId || rawData.team_id) as string | undefined;
  if (teamIdStr) data.team = { connect: { id: teamIdStr } };

  const userIdStr = (rawData.userId || rawData.user_id || rawData.employeeId || userId) as string | undefined;
  if (userIdStr) data.user = { connect: { id: userIdStr } };

  return data;
}

function finalizeReportData(cleanData: Record<string, unknown>): Record<string, unknown> {
  const finalData = Object.fromEntries(
    Object.entries(cleanData).filter(([, v]) => v != null),
  );

  const fieldsToRemove = [
    "scheduledAt", "executedAt", "reviewedAt", "syncedAt",
    "id", "createdAt", "updatedAt", "scheduled_at",
    "executed_at", "reviewed_at",
  ];

  fieldsToRemove.forEach((field) => delete finalData[field]);
  return finalData;
}
