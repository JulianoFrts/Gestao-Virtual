import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { TeamService } from "@/modules/teams/application/team.service";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";

// DI
const teamService = new TeamService(new PrismaTeamRepository());

const moveMemberSchema = z.object({
  employeeId: z.string().min(1, "ID do funcionário é obrigatório"),
  toTeamId: z.string().nullable().optional(),
});

/**
 * POST /api/v1/teams/members/move
 * Atomic movement of an employee between teams or to talent pool.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const data = moveMemberSchema.parse(body);

    const result = await teamService.moveMember(
      data.employeeId,
      data.toTeamId || null,
    );

    logger.info("Membro movido atomicamente", {
      employeeId: data.employeeId,
      toTeamId: data.toTeamId,
    });

    return ApiResponse.json(result, "Membro movido com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/teams/members/move/route.ts#POST",
    );
  }
}
