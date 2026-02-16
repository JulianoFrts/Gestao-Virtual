import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { z } from "zod";
import { AccessControlService } from "@/modules/access-control/application/access-control.service";
import { PrismaAccessControlRepository } from "@/modules/access-control/infrastructure/prisma-access-control.repository";
import { VALIDATION } from "@/lib/constants";

// DI
const service = new AccessControlService(new PrismaAccessControlRepository());

const querySchema = z.object({
  name: z.string().optional(),
});

const createPermissionSchema = z.object({
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME),
  description: z.string().optional(),
  rank: z.number().int().optional(),
  power: z.number().int().optional(), // Alias for rank
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name") || undefined;

    const result = await service.listLevels(name);
    return ApiResponse.json(result);
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/permissions/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
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
  } catch (error: any) {
    if (error.message === "LEVEL_ALREADY_EXISTS") {
      return ApiResponse.conflict(
        "Permission level with this name already exists",
      );
    }
    return handleApiError(error, "src/app/api/v1/permissions/route.ts#POST");
  }
}
