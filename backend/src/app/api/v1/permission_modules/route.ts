import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { AccessControlService } from "@/modules/access-control/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/access-control/infrastructure/prisma-access-control.repository";

// DI
const service = new AccessControlService(new PrismaAccessControlRepository());

import { z } from "zod";

const moduleSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().optional(),
});

const modulesSchema = z.union([moduleSchema, z.array(moduleSchema)]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const modules = await service.listModules();
    return ApiResponse.json(modules);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/permission_modules/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const body = await request.json();
    const validation = modulesSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.issues.map(i => i.message));
    }

    const items = Array.isArray(validation.data) ? validation.data : [validation.data];

    const count = await service.processModules(items);
    return ApiResponse.json({ count }, "Módulos processados com sucesso");
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/permission_modules/route.ts#POST");
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    let idsString = searchParams.get("id");

    if (!idsString) {
      return ApiResponse.badRequest("ID(s) não fornecidos");
    }

    const IN_PREFIX = "in.";
    if (idsString.startsWith(IN_PREFIX)) {
      idsString = idsString.substring(IN_PREFIX.length);
    }

    const ids = idsString.split(",");
    const count = await service.removeModules(ids);

    return ApiResponse.json({ count }, "Módulos removidos com sucesso");
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/permission_modules/route.ts#DELETE");
  }
}
