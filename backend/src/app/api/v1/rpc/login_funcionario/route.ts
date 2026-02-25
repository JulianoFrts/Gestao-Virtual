/**
 * RPC Compatibility API - GESTÃO VIRTUAL Backend
 */

import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";
import { generateToken } from "@/lib/auth/token";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { AuthService } from "@/modules/auth/application/auth.service";
import { PrismaAuthCredentialRepository } from "@/modules/auth/infrastructure/prisma-auth-credential.repository";
import { SESSION_MAX_AGE } from "@/lib/constants";

// Singleton services para a rota (usando o prisma global)
const userService = new UserService(new PrismaUserRepository());
const authService = new AuthService(userService, new PrismaAuthCredentialRepository());

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    if (!body) return ApiResponse.badRequest("JSON inválido ou corpo vazio");

    const credentials = extractCredentials(body);
    if (!credentials.identifier || !credentials.password) {
      logger.warn("RPC Login Func: Parâmetros ausentes", { body });
      return ApiResponse.badRequest("Identificador e senha são obrigatórios");
    }

    logger.info("Tentativa de login funcionário", {
      identifier: credentials.identifier,
    });

    const user = await authService.resolveLoginIdentifier(
      credentials.identifier,
    );

    if (!user || !(user as any).password) {
      return ApiResponse.unauthorized("Usuário não encontrado ou sem senha");
    }

    const isValid = await (authService as any).verifyCredentials(
      credentials.identifier,
      credentials.password,
    );
    if (!isValid) {
      return ApiResponse.unauthorized(
        "Senha incorreta ou credenciais inválidas",
      );
    }

    const token = await generateToken({
      id: user.userId as string,
      email: user.email as string,
      name: (user as any).user?.name || "Funcionário",
      role: (user as any).user?.role || "USER",
      status: user.status as string,
      companyId: undefined,
      projectId: undefined,
    });

    return ApiResponse.json({
      user: {
        id: user.userId,
        email: user.email,
        name: (user as any).user?.name,
        role: (user as any).user?.role || "USER",
        registrationNumber: (user as any).user?.registrationNumber,
        cpf: (user as any).user?.cpf,
        companyId: undefined,
        projectId: undefined,
      },
      access_token: token,
      token_type: "bearer",
      expires_in: SESSION_MAX_AGE,
    });
  } catch (error) {

    return handleApiError(error, "src/app/api/v1/rpc/login_funcionario/route.ts#POST");
  }
}

async function parseRequestBody(request: NextRequest) {
  try {
    const rawBody = await request.text();
    return rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return null;
  }
}

function extractCredentials(body: any) {
  return {
    identifier:
      body.identifier ||
      body.email ||
      body.params?.identifier ||
      body.params?.email,
    password:
      body.password ||
      body.passwd ||
      body.params?.password ||
      body.params?.passwd,
  };
}
