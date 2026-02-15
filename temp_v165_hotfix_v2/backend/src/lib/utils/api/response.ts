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
import { ZodError } from "zod";

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

  static json<T>(data: T, message?: string, status = 200): NextResponse {
    return NextResponse.json(this.success(data, message), { status });
  }

  static errorJson(
    message: string,
    status = 400,
    errors?: string[],
    code?: ErrorCode,
  ): NextResponse {
    return NextResponse.json(this.error(message, errors, code), { status });
  }

  static created<T>(data: T, message = "Criado com sucesso"): NextResponse {
    return this.json(data, message, 201);
  }

  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  static badRequest(
    message = "Requisição inválida",
    errors?: string[],
  ): NextResponse {
    return this.errorJson(message, 400, errors, "VALIDATION_ERROR");
  }

  static unauthorized(message = "Não autenticado"): NextResponse {
    return this.errorJson(message, 401, undefined, "UNAUTHORIZED");
  }

  static forbidden(message = "Sem permissão para esta ação"): NextResponse {
    return this.errorJson(message, 403, undefined, "FORBIDDEN");
  }

  static notFound(message = "Recurso não encontrado"): NextResponse {
    return this.errorJson(message, 404, undefined, "NOT_FOUND");
  }

  static conflict(message = "Conflito com recurso existente"): NextResponse {
    return this.errorJson(message, 409, undefined, "CONFLICT");
  }

  static tooManyRequests(
    message = "Muitas requisições. Tente novamente mais tarde.",
    retryAfter?: number,
  ): NextResponse {
    const response = this.errorJson(message, 429, undefined, "RATE_LIMITED");

    if (retryAfter) {
      response.headers.set("Retry-After", String(retryAfter));
    }

    return response;
  }

  static internalError(
    message = "Erro interno do servidor",
    errors?: string[],
  ): NextResponse {
    return this.errorJson(message, 500, errors, "INTERNAL_ERROR");
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
  meta?: { target?: string[] };
};

function isPrismaError(error: unknown): error is PrismaKnownError {
  return typeof error === "object" && error !== null && "code" in error;
}

function handlePrismaError(error: PrismaKnownError): NextResponse {
  switch (error.code) {
    case "P2002": {
      const field = error.meta?.target?.[0] ?? "campo";
      return ApiResponse.conflict(`${field} já está em uso`);
    }
    case "P2025":
      return ApiResponse.notFound("Registro não encontrado");
    case "P2003":
      return ApiResponse.badRequest("Referência inválida");
    default:
      logger.error("Unhandled Prisma error", error);
      return ApiResponse.internalError();
  }
}

function handleCustomError(error: Error, source?: string): NextResponse {
  const message = error.message;

  if (message.includes("Não autenticado")) {
    logger.warn(message, { source });
    return ApiResponse.unauthorized();
  }

  if (message.includes("Sem permissão") || message.includes("Acesso restrito") || message.includes("Soberania de Hierarquia")) {
    logger.warn(message, { source });
    return ApiResponse.forbidden(message);
  }

  if (message.includes("não encontrad")) {
    return ApiResponse.notFound(message);
  }

  if (process.env.NODE_ENV === "development") {
    logger.error("API Error", { error, source });
    return ApiResponse.internalError(message);
  }

  logger.error("API Error", { source });
  return ApiResponse.internalError();
}

export default ApiResponse;
