import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { SystemMessageService } from "@/modules/common/application/system-message.service";
import { PrismaSystemMessageRepository } from "@/modules/common/infrastructure/prisma-system-message.repository";
import { API, CONSTANTS } from "@/lib/constants";

// DI
const systemMessageService = new SystemMessageService(
  new PrismaSystemMessageRepository(),
);

const createMessageSchema = z.object({
  recipientUserId: z.string().optional(),
  recipientRole: z.string().optional(),
  companyId: z.string().optional(),
  projectId: z.string().optional(),
  siteId: z.string().optional(),
  messageType: z.enum([
    "PASSWORD_RESET",
    "ADMINISTRATIVE",
    "HR",
    "OPERATIONAL",
    "DIRECT",
    "OTHER",
  ]),
  subject: z.string().min(1).max(CONSTANTS.VALIDATION.STRING.MAX_SHORT_TEXT),
  content: z.string().min(1),
  attachmentUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const querySchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.number().min(1).max(API.PAGINATION.MAX_LIMIT).default(API.PAGINATION.DEFAULT_PAGE_SIZE),
  ),
  recipientUserId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  messageType: z
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
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      recipientUserId: searchParams.get("recipientUserId"),
      messageType: searchParams.get("messageType"),
      status: searchParams.get("status"),
    });

    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(user.role);

    const result = await systemMessageService.listMessages({
      ...query,
      currentUser: user,
      isAdmin,
    });

    return ApiResponse.json(result);
  } catch (error) {
    logger.error("Erro ao listar mensagens", { error });
    return handleApiError(error, "src/app/api/v1/system_messages/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const data = createMessageSchema.parse(body);

    const message = await systemMessageService.createMessage(data, {
      id: user.id,
      email: user.email,
    });

    logger.info("Mensagem criada", { messageId: message.id });

    return ApiResponse.created(message, "Mensagem enviada com sucesso");
  } catch (error) {
    logger.error("Erro ao criar mensagem", { error });
    return handleApiError(error, "src/app/api/v1/system_messages/route.ts#POST");
  }
}
