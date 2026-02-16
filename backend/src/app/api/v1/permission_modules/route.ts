import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { AccessControlService } from "@/modules/access-control/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/access-control/infrastructure/prisma-access-control.repository";

// DI
const service = new AccessControlService(new PrismaAccessControlRepository());

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const modules = await service.listModules();
    return ApiResponse.json(modules);
  } catch (error: any) {

    return handleApiError(error, "src/app/api/v1/permission_modules/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    const count = await service.processModules(items);
    return ApiResponse.json({ count }, "Módulos processados com sucesso");
  } catch (error: any) {

    return handleApiError(error, "src/app/api/v1/permission_modules/route.ts#POST");
  }
}

export async function DELETE(request: NextRequest) {
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
  } catch (error: any) {

    return handleApiError(error, "src/app/api/v1/permission_modules/route.ts#DELETE");
  }
}
