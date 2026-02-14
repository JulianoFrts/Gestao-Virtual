import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { TeamService } from "@/modules/teams/application/team.service";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";

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

    const { p_employee_id, p_from_team_id, p_to_team_id } =
      (await request.json()) as any;

    if (!p_employee_id) {
      return ApiResponse.badRequest("ID do funcionário é obrigatório");
    }

    await teamService.moveMember(p_employee_id, p_to_team_id);

    logger.info("Membro de equipe movido com sucesso", {
      employeeId: p_employee_id,
      from: p_from_team_id,
      to: p_to_team_id,
    });

    return ApiResponse.json(null, "Membro movido com sucesso");
  } catch (error) {
    return handleApiError(
      error,
      "src/app/api/v1/rpc/move_team_member/route.ts#POST",
    );
  }
}
