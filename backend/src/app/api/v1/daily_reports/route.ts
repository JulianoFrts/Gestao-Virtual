import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { DailyReportService } from "@/modules/production/application/daily-report.service";
import { PrismaDailyReportRepository } from "@/modules/production/infrastructure/prisma-daily-report.repository";
import { API } from "@/lib/constants";

// DI
const dailyReportService = new DailyReportService(
  new PrismaDailyReportRepository(),
);

const createDailyReportSchema = z.object({
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
}).passthrough();

const querySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).max(API.PAGINATION.MAX_LIMIT).default(API.PAGINATION.DEFAULT_PAGE_SIZE),
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
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      teamId: searchParams.get("teamId"),
      userId: searchParams.get("userId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(currentUser.role);

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
    const user = await requireAuth();

    const body = await request.json();
    logger.info("[daily_reports POST] Body received", { bodyKeys: Object.keys(body), activities: typeof body.activities, activitiesLen: body.activities?.length });

    let rawData;
    try {
      rawData = createDailyReportSchema.parse(body);
    } catch (zodErr: any) {
      logger.error("[daily_reports POST] Zod validation failed", { issues: zodErr.issues, bodySnapshot: JSON.stringify(body).slice(0, 500) });
      throw zodErr;
    }

    // Mapeamento de campos garantindo segurança (Herança de companyId do usuário)
    const data = {
      teamId: rawData.teamId || rawData.team_id || null,
      userId: rawData.userId || rawData.user_id || (user as any).id,
      companyId: (user as any).companyId || rawData.companyId || rawData.company_id || null,
      reportDate: rawData.reportDate || rawData.report_date,
      activities: rawData.activities || "Atividade sem descrição",
      observations: rawData.observations || null,
      localId: rawData.localId || rawData.local_id || null,
      subPoint: rawData.subPoint || rawData.sub_point || null,
      subPointType: rawData.subPointType || rawData.sub_point_type || null,
      metadata: rawData.metadata || (body as any).metadata || {},
      createdBy: rawData.createdBy || rawData.created_by || (user as any).id,
    };

    const report = await dailyReportService.createReport(data);

    logger.info("Relatório criado", { reportId: report.id });

    return ApiResponse.created(report, "Relatório criado com sucesso");
  } catch (error) {
    logger.error("Erro ao criar relatório", { error });
    return handleApiError(error, "src/app/api/v1/daily_reports/route.ts#POST");
  }
}
