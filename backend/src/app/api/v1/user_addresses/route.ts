import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";
import { requireAuth, requireScope } from "@/lib/auth/session";

import { z } from "zod";

// DI (Manual)
const userRepository = new PrismaUserRepository();
const systemAuditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, systemAuditRepository);

const addressSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  cep: z.string().optional().default(''),
  logradouro: z.string().optional().default(''),
  complemento: z.string().optional().nullable(),
  unidade: z.string().optional().nullable(),
  bairro: z.string().optional().default(''),
  localidade: z.string().optional().default(''),
  uf: z.string().optional().default(''),
  estado: z.string().optional().default(''),
  regiao: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
});

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const body = await req.json();
    
    const validation = addressSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const { user_id, cep, logradouro, complemento, unidade, bairro, localidade, uf, estado, regiao, number } = validation.data;

    // Segurança: Garantir que usuário só edita seu próprio endereço (ou seja admin)
    await requireScope(user_id, "USER", req);

    const data = {
        cep,
        street: logradouro,
        complement: complemento,
        unit: unidade,
        neighborhood: bairro,
        city: localidade,
        stateCode: uf ? String(uf).substring(0, 2).toUpperCase() : '',
        stateName: estado,
        region: regiao,
        number: number
    };

    logger.debug('[UserAddress] Upserting for user:', user_id, data);

    const address = await userService.upsertAddress(user_id, data);
    return ApiResponse.json(address);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/user_addresses/route.ts#POST");
  }
}
