import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { TeamService } from "@/modules/teams/application/team.service";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";
import { CONSTANTS } from "@/lib/constants";

// DI
const teamService = new TeamService(new PrismaTeamRepository());

const updateTeamSchema = z.object({
  name: z.string().min(2).max(CONSTANTS.VALIDATION.STRING.MAX_SHORT_TEXT).optional(),
  supervisorId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
  laborType: z.enum(["MOD", "MOI"]).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;

    const team = await teamService.getTeamById(id);

    return ApiResponse.json(team);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/teams/[id]/route.ts#GET");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const data = updateTeamSchema.parse(body);

    const team = await teamService.updateTeam(id, data);

    logger.info("Equipe atualizada", { teamId: team.id });

    return ApiResponse.json(team, "Equipe atualizada com sucesso");
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/teams/[id]/route.ts#PUT");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    await teamService.deleteTeam(id);

    logger.info("Equipe removida", { teamId: id });

    return ApiResponse.noContent();
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/teams/[id]/route.ts#DELETE");
  }
}
