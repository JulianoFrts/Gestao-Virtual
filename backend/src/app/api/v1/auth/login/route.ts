/**
 * Auth Login Compatibility API - GESTÃO VIRTUAL Backend
 *
 * Endpoint: POST /api/v1/auth/login
 *
 * Este endpoint é necessário para compatibilidade com o frontend legado
 * que tenta fazer login diretamente via POST ao invés de usar NextAuth hooks.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api/response";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { generateToken } from "@/lib/auth/token";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { AuthService } from "@/modules/auth/application/auth.service";
import { PrismaAuthCredentialRepository } from "@/modules/auth/infrastructure/prisma-auth-credential.repository";
import { HTTP_STATUS, SESSION_MAX_AGE } from "@/lib/constants";

const userService = new UserService(new PrismaUserRepository());
const authService = new AuthService(userService, new PrismaAuthCredentialRepository());

const loginSchema = z.object({
  email: z.string().min(1), // Permite email ou matrícula/login
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const parseResult = await parseLoginRequest(request);
    if (parseResult.error)
      return NextResponse.json({ error: parseResult.error, issues: parseResult.issues }, { status: HTTP_STATUS.BAD_REQUEST });

    const { email, password } = parseResult.data!;

    logger.info("Tentativa de login recebida", { email: email.substring(0, 3) + "..." });

    try {
      const user = await authService.verifyCredentials(email, password);
      if (!user) {
        logger.warn("Credenciais inválidas", { email: email.substring(0, 3) + "..." });
        return NextResponse.json({ error: "Credenciais inválidas" }, { status: HTTP_STATUS.UNAUTHORIZED });
      }

      logger.info("Usuário verificado no banco. Gerando token...", { userId: user.id });

      // 4. Gerar Token JWT via Helper
      const token = await generateToken({
        id: user.id!,
        email: user.email!,
        name: user.name!,
        role: user.role!,
        status: user.status!,
        companyId: undefined,
        projectId: undefined,
      });

      logger.info("Login realizado com sucesso", { email: email.substring(0, 3) + "...", userId: user.id });

      // 3. Calcular permissões efetivas para o frontend
      const permissions = await userService.getPermissionsMap(
        user.role!,
        user.id,
        undefined // Token não deve ser passado aqui
      );
      // 5. Retornar dados no formato esperado pelo frontend legado + novas permissões
      // 5. Retornar dados no formato direto (plano) esperado pelo frontend legado
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          companyId: undefined,
          projectId: undefined,
        },
        permissions, // Frontend usará isso via Signals
        access_token: token,
        token_type: "bearer",
        expires_in: SESSION_MAX_AGE,
      });
    } catch (dbError: any) {
      logger.error("ERRO CRÍTICO NO BANCO/TOKEN DURANTE LOGIN", {
        message: dbError.message,
        stack: dbError.stack,
        code: dbError.code
      });
      throw dbError; // Será capturado pelo catch externo e handled pelo handleApiError
    }
  } catch (error: any) {
    logger.error("Erro no endpoint de login legado", { error });
    return handleApiError(error, "src/app/api/v1/auth/login/route.ts#POST");
  }
}

async function parseLoginRequest(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) return { error: "Corpo vazio" };

    const body = JSON.parse(rawBody);
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return {
        error: "Dados de login inválidos",
        issues: validation.error.issues.map((e: any) => e.message),
      };
    }

    return { data: validation.data };
  } catch {
    return { error: "Corpo da requisição deve ser um JSON válido" };
  }
}
