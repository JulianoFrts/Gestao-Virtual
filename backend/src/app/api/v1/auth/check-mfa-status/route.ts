/**
 * @swagger
 * /api/v1/auth/check-mfa-status:
 *   post:
 *     summary: Verifica se um email tem MFA habilitado
 *     description: Usado para recuperação de senha via 2FA - só permite se tiver MFA
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email ou login do usuário
 *     responses:
 *       200:
 *         description: Status do MFA retornado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 found:
 *                   type: boolean
 *                 hasMfa:
 *                   type: boolean
 *                 hasLogin:
 *                   type: boolean
 */
import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { AuthService } from "@/modules/auth/application/auth.service";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";
import { PrismaAuthCredentialRepository } from "@/modules/auth/infrastructure/prisma-auth-credential.repository";

// DI (Manual)
const userRepository = new PrismaUserRepository();
const systemAuditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, systemAuditRepository);
const authRepo = new PrismaAuthCredentialRepository();
const authService = new AuthService(userService, authRepo);

import { z } from "zod";

const checkMfaSchema = z.object({
  identifier: z.string().min(1, "Identifier é obrigatório"),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    
    const validation = checkMfaSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.badRequest(validation.error.issues[0].message);
    }

    const { identifier } = validation.data;

    const result = await authService.checkMfaStatus(identifier);
    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/auth/check-mfa-status/route.ts#POST");
  }
}
