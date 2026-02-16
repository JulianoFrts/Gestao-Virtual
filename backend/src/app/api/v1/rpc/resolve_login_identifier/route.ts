/**
 * RPC Compatibility API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: POST /api/v1/rpc/resolve_login_identifier
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";
import { AuthService } from "@/modules/auth/application/auth.service";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";

import { PrismaAuthCredentialRepository } from "@/modules/auth/infrastructure/prisma-auth-credential.repository";

// DI
const userService = new UserService(new PrismaUserRepository());
const authService = new AuthService(userService, new PrismaAuthCredentialRepository());

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      const rawBody = await request.text();
      if (!rawBody) return ApiResponse.badRequest("Corpo vazio");
      body = JSON.parse(rawBody);
    } catch (e) {
      return ApiResponse.badRequest("JSON inválido");
    }

    const identifier =
      body.identifier ||
      body.email ||
      body.params?.identifier ||
      body.params?.email;

    if (!identifier || typeof identifier !== "string") {
      logger.warn("RPC Resolve: Identificador ausente", { body });
      return ApiResponse.badRequest("Identificador não informado ou inválido");
    }

    logger.info("Resolvendo identificador de login", { identifier });

    const user = await authService.resolveLoginIdentifier(identifier);

    if (!user) {
      return ApiResponse.notFound("Usuário não encontrado");
    }

    return ApiResponse.json(user);
  } catch (error: any) {

    return handleApiError(error, "src/app/api/v1/rpc/resolve_login_identifier/route.ts#POST");
  }
}
