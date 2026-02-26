import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { z } from "zod";
import { AccessControlService } from "@/modules/access-control/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/access-control/infrastructure/prisma-access-control.repository";
import { VALIDATION } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth/session";

// DI
const service = new AccessControlService(new PrismaAccessControlRepository());

const createPermissionSchema = z.object({
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME),
  description: z.string().optional(),
  rank: z.number().int().optional(),
  power: z.number().int().optional(), // Alias for rank
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name") || undefined;

    const result = await service.listLevels(name);
    return ApiResponse.json(result);
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/permissions/route.ts#GET");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const body = await request.json();
    const validation = createPermissionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponse.validationError(validation.error.errors.map(e => e.message));
    }

    const { name, description, rank, power } = validation.data;

    const result = await service.createLevel({
      name,
      description,
      rank: rank ?? power,
    });

    return ApiResponse.created(result, "Permission level created successfully");
  } catch (error: unknown) {
    if (error?.message === "LEVEL_ALREADY_EXISTS") {
      return ApiResponse.conflict(
        "Permission level with this name already exists",
      );
    }
    return handleApiError(error, "src/app/api/v1/permissions/route.ts#POST");
  }
}
