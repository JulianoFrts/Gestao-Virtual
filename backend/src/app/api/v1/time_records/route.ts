import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { TimeRecordService } from "@/modules/production/application/time-record.service";
import { PrismaTimeRecordRepository } from "@/modules/production/infrastructure/prisma-time-record.repository";
import { API } from "@/lib/constants";

// DI
const timeRecordService = new TimeRecordService(
  new PrismaTimeRecordRepository(),
);

const createTimeRecordSchema = z.object({
  userId: z.string(),
  teamId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  recordType: z.enum(["entry", "exit"]),
  recordedAt: z.string().datetime(),
  photoUrl: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  localId: z.string().optional(),
});

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
  userId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((schemaInput) => schemaInput || undefined),
  teamId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((schemaInput) => schemaInput || undefined),
  companyId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((schemaInput) => schemaInput || undefined),
  startDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((schemaInput) => schemaInput || undefined),
  endDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((schemaInput) => schemaInput || undefined),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      userId: searchParams.get("userId"),
      teamId: searchParams.get("teamId"),
      companyId: searchParams.get("companyId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    const result = await timeRecordService.listRecords(query, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/time_records/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requireAuth();

    const body = await request.json();
    const data = createTimeRecordSchema.parse(body);

    const timeRecord = await timeRecordService.createRecord(data, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    logger.info("Registro de ponto criado", {
      recordId: timeRecord.id,
      userId: user.id,
    });

    return ApiResponse.created(
      timeRecord,
      "Registro de ponto criado com sucesso",
    );
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/time_records/route.ts#POST");
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requirePermission(
      "production.manage",
      request,
    );

    const body = await request.json();
    const id = body.id;

    if (!id) {
      return ApiResponse.badRequest(
        "ID do registro é obrigatório para atualização",
      );
    }

    const timeRecord = await timeRecordService.updateRecord(id, body, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    logger.info("Registro de ponto atualizado", {
      recordId: id,
      userId: user.id,
    });

    return ApiResponse.json(
      timeRecord,
      "Registro de ponto atualizado com sucesso",
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(error, "src/app/api/v1/time_records/route.ts#PUT");
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const user = await authSession.requirePermission(
      "production.manage",
      request,
    );

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return ApiResponse.badRequest(
        "ID do registro é obrigatório para exclusão",
      );
    }

    await timeRecordService.deleteRecord(id, {
      role: user.role,
      companyId: user.companyId,
      hierarchyLevel: user.hierarchyLevel,
      permissions: (user.permissions as Record<string, boolean>),
    });

    logger.info("Registro de ponto excluído", {
      recordId: id,
      userId: user.id,
    });

    return ApiResponse.noContent();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return ApiResponse.forbidden(error.message);
    }
    return handleApiError(error, "src/app/api/v1/time_records/route.ts#DELETE");
  }
}
