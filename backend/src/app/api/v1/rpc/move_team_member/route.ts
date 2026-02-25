import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { TeamService } from "@/modules/teams/application/team.service";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";
import { Validator } from "@/lib/utils/api/validator";
import { moveTeamMemberSchema } from "@/lib/utils/validators/route-schemas";

// DI
const teamService = new TeamService(new PrismaTeamRepository());

/**
 * RPC: move_team_member
 *
 * Move um funcionário de uma equipe para outra ou remove de uma equipe.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();

    const validation = Validator.validate(moveTeamMemberSchema, body);
    if (!validation.success) return validation.response;

    const { p_employee_id, p_to_team_id } = validation.data;

    logger.debug("[RPC] move_team_member params:", {
      employeeId: p_employee_id,
      to: p_to_team_id,
    });

    await teamService.moveMember(p_employee_id, p_to_team_id ?? null);

    return ApiResponse.json(null, "Membro movido com sucesso");
  } catch (error: any) {
    logger.error("[RPC ERR] Error in move_team_member:", {
      message: error.message,
    });
    return handleApiError(
      error,
      "src/app/api/v1/rpc/move_team_member/route.ts#POST",
    );
  }
}
