import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { UserService } from "@/modules/users/application/user.service";
import { PrismaUserRepository } from "@/modules/users/infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "@/modules/audit/infrastructure/prisma-system-audit.repository";

// DI (Manual)
const userRepository = new PrismaUserRepository();
const systemAuditRepository = new PrismaSystemAuditRepository();
const userService = new UserService(userRepository, systemAuditRepository);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, cep, logradouro, complemento, unidade, bairro, localidade, uf, estado, regiao, number } = body;

    if (!user_id) {
        return ApiResponse.badRequest('user_id is required');
    }

    const data = {
        cep: cep || '',
        street: logradouro || '',
        complement: complemento || null,
        unit: unidade || null,
        neighborhood: bairro || '',
        city: localidade || '',
        // Enforce 2-char limit for UF (Schema constraint)
        stateCode: uf ? String(uf).substring(0, 2).toUpperCase() : '',
        stateName: estado || '',
        region: regiao || null,
        number: number || null
    };

    console.log('[UserAddress] Upserting for user:', user_id, data);

    const address = await userService.upsertAddress(user_id, data);
    return ApiResponse.json(address);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/user_addresses/route.ts#POST");
  }
}
