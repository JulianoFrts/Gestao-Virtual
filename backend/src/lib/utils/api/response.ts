/**
 * Respostas Padronizadas da API - GESTÃO VIRTUAL Backend
 */

import { NextResponse } from "next/server";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ErrorCode,
} from "@/types/api";
import { logger } from "@/lib/utils/logger";
import { RequestContext } from "@/lib/utils/request-context";
import { ZodError } from "zod";
import { HTTP_STATUS } from "@/lib/constants";

// =============================================
// CLASSE PRINCIPAL
// =============================================

export class ApiResponse {
  static success<T>(data: T, message?: string): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    message: string,
    errors?: string[],
    code?: ErrorCode,
  ): ApiErrorResponse {
    return {
      success: false,
      message,
      errors,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  static json<T>(
    data: T,
    message?: string,
    status: number = HTTP_STATUS.OK,
  ): NextResponse {
    const responseData = this.success(data, message);

    // Otimização de Log: Pular health checks e evitar payloads gigantescos
    const isHealthCheck =
      typeof data === "object" &&
      data !== null &&
      (data as any).status === "ok";

    if (!isHealthCheck && status >= 400) {
      logger.standard(
        status,
        RequestContext.getMethod(),
        RequestContext.getPath(),
      );
    }

    return NextResponse.json(responseData, { status });
  }

  static errorJson(
    message: string,
    status: number = HTTP_STATUS.BAD_REQUEST,
    errors?: string[],
    code?: ErrorCode,
  ): NextResponse {
    const errorData = this.error(message, errors, code);

    logger.standard(
      status,
      RequestContext.getMethod(),
      RequestContext.getPath(),
      message,
      code,
    );

    return NextResponse.json(errorData, { status });
  }

  /**
   * Resume dados para o log para evitar bottlenecks de stdout
   */
  private static summarizeForLog(data: any): any {
    if (typeof data === "string" && data.length > 50) {
      return `${data.slice(0, 10)}... [+${data.length - 10} chars]`;
    }

    if (Array.isArray(data)) {
      if (data.length > 10) {
        return {
          _type: "LargeArray",
          length: data.length,
          preview: data.slice(0, 3).map((item) => this.summarizeForLog(item)),
          note: "Payload resumido para performance",
        };
      }
      return data.map((item) => this.summarizeForLog(item));
    }

    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length > 50) {
        return {
          _type: "LargeObject",
          keysCount: keys.length,
          keysPreview: keys.slice(0, 10),
          note: "Payload resumido para performance",
        };
      }

      const result: any = {};
      for (const key of keys) {
        result[key] = this.summarizeForLog(data[key]);
      }
      return result;
    }

    return data;
  }

  static created<T>(data: T, message = "Criado com sucesso"): NextResponse {
    return this.json(data, message, HTTP_STATUS.CREATED);
  }

  static noContent(): NextResponse {
    return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT });
  }

  static badRequest(
    message = "Requisição inválida",
    errors?: string[],
  ): NextResponse {
    return this.errorJson(
      message,
      HTTP_STATUS.BAD_REQUEST,
      errors,
      "VALIDATION_ERROR",
    );
  }

  static unauthorized(message = "Não autenticado"): NextResponse {
    return this.errorJson(
      message,
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      "UNAUTHORIZED",
    );
  }

  static forbidden(message = "Sem permissão para esta ação"): NextResponse {
    return this.errorJson(
      message,
      HTTP_STATUS.FORBIDDEN,
      undefined,
      "FORBIDDEN",
    );
  }

  static notFound(message = "Recurso não encontrado"): NextResponse {
    return this.errorJson(
      message,
      HTTP_STATUS.NOT_FOUND,
      undefined,
      "NOT_FOUND",
    );
  }

  static conflict(message = "Conflito com recurso existente"): NextResponse {
    return this.errorJson(message, HTTP_STATUS.CONFLICT, undefined, "CONFLICT");
  }

  static tooManyRequests(
    message = "Muitas requisições. Tente novamente mais tarde.",
    retryAfter?: number,
  ): NextResponse {
    const response = this.errorJson(
      message,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      undefined,
      "RATE_LIMITED",
    );

    if (retryAfter) {
      response.headers.set("Retry-After", String(retryAfter));
    }

    return response;
  }

  static internalError(
    message = "Erro interno do servidor",
    errors?: string[],
  ): NextResponse {
    return this.errorJson(
      message,
      HTTP_STATUS.INTERNAL_ERROR,
      errors,
      "INTERNAL_ERROR",
    );
  }

  static validationError(errors: string[]): NextResponse {
    return this.badRequest("Erro de validação", errors);
  }
}

// =============================================
// ERROR HANDLING
// =============================================

export async function withErrorHandler<T>(
  handler: () => Promise<NextResponse | T>,
): Promise<NextResponse> {
  try {
    const result = await handler();

    if (result instanceof NextResponse) {
      return result;
    }

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export function handleApiError(error: unknown, source?: string): NextResponse {
  // ZOD
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // PRISMA
  if (isPrismaError(error)) {
    return handlePrismaError(error);
  }

  // CUSTOM ERROR
  if (error instanceof Error) {
    return handleCustomError(error, source);
  }

  logger.error("Unknown API error", { error, source });
  return ApiResponse.internalError();
}

// =============================================
// HANDLERS ESPECÍFICOS
// =============================================

function handleZodError(error: ZodError): NextResponse {
  const messages = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  logger.warn("Zod validation error", { messages });
  return ApiResponse.validationError(messages);
}

type PrismaKnownError = {
  code: string;
  meta?: { target?: string[]; [key: string]: any };
  message?: string;
  clientVersion?: string;
};

function isPrismaError(error: unknown): error is PrismaKnownError {
  if (typeof error !== "object" || error === null || !("code" in error))
    return false;
  const code = (error as any).code;
  // Prisma error codes always start with "P" followed by digits
  return typeof code === "string" && /^P\d{4}$/.test(code);
}

function handlePrismaError(error: PrismaKnownError): NextResponse {
  const logContext = {
    code: error.code,
    meta: error.meta,
    message: error.message,
  };

  switch (error.code) {
    // Unique constraint violation
    case "P2002": {
      const field = error.meta?.target?.[0] ?? "campo";
      return ApiResponse.conflict(`${field} já está em uso`);
    }
    // Record not found
    case "P2025":
      return ApiResponse.notFound("Registro não encontrado");
    // Foreign key constraint failed
    case "P2003":
      return ApiResponse.badRequest("Referência inválida");
    // Connection errors
    case "P1001":
    case "P1002":
    case "P1008":
    case "P1017":
      logger.error("Prisma connection error", logContext);
      return ApiResponse.errorJson(
        "Serviço temporariamente indisponível. Tente novamente.",
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        undefined,
        "SERVICE_UNAVAILABLE",
      );
    // Schema errors (table/column not found)
    case "P2021":
    case "P2022":
      logger.error("Prisma schema mismatch error", logContext);
      return ApiResponse.internalError(
        "Erro de configuração do banco de dados",
      );
    default:
      logger.error("Unhandled Prisma error", logContext);
      return ApiResponse.internalError();
  }
}

function handleCustomError(error: Error, source?: string): NextResponse {
  const message = error.message;

  if (message.includes("Não autenticado")) {
    logger.warn(message, { source });
    return ApiResponse.unauthorized();
  }

  if (
    message.includes("Sem permissão") ||
    message.includes("Acesso restrito") ||
    message.includes("Soberania de Hierarquia")
  ) {
    logger.warn(message, { source });
    return ApiResponse.forbidden(message);
  }

  if (message.includes("não encontrad")) {
    return ApiResponse.notFound(message);
  }

  if (
    message.includes("Incompatibilidade") ||
    message.includes("inválido") ||
    message.includes("obrigatório")
  ) {
    return ApiResponse.badRequest(message);
  }

  if (message.includes("já está") || message.includes("duplicado")) {
    return ApiResponse.conflict(message);
  }

  if (process.env.NODE_ENV === "development") {
    logger.error("API Error", { error, source });
    return ApiResponse.internalError(message);
  }

  logger.error("API Error", { source });
  return ApiResponse.internalError();
}

export default ApiResponse;
