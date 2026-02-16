import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { TeamService } from "@/modules/teams/application/team.service";
import { PrismaTeamRepository } from "@/modules/teams/infrastructure/prisma-team.repository";
import { API } from "@/lib/constants";

// DI
const teamService = new TeamService(new PrismaTeamRepository());

const querySchema = z.object({
  page: z.preprocess(
    (val) => (val === "undefined" || !val ? undefined : val),
    z.coerce.number().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (val === "undefined" || !val || val === "0" ? undefined : val),
    z.coerce.number().min(1).max(API.BATCH.EXTREME).default(API.BATCH.LARGE),
  ),
  teamId: z.preprocess(
    (val) => (val === "undefined" || !val ? undefined : val),
    z.string().uuid().optional(),
  ),
  userId: z.preprocess(
    (val) => (val === "undefined" || !val ? undefined : val),
    z.string().optional(),
  ),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      teamId: searchParams.get("teamId"),
      userId: searchParams.get("userId"),
    });

    const result = await teamService.listMembers(query as any);

    return ApiResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/team_members/route.ts#GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return ApiResponse.badRequest("Nenhum dado fornecido");
    }

    // Mapeamento extra de segurança snake_case -> camelCase compatibilizado no serviço
    const formattedItems = items.map((item) => ({
      teamId: item.teamId || item.team_id,
      userId: item.userId || item.user_id,
    }));

    const results = await teamService.addMembersBatch(formattedItems);

    logger.info(`${results.length} membros processados na equipe`);

    return ApiResponse.json(
      Array.isArray(body) ? results : results[0],
      `Processados ${results.length} membros.`,
    );
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/team_members/route.ts#POST");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get("teamId") || searchParams.get("team_id");
    const userId = searchParams.get("userId") || searchParams.get("user_id");

    if (teamId && !userId) {
      // Deleção em lote (todos os membros de uma equipe)
      const result = await teamService.removeAllMembers(teamId);
      logger.info("Membros removidos da equipe em lote", {
        teamId,
        count: (result as any).count,
      });
      return ApiResponse.noContent();
    }

    if (!teamId || !userId) {
      return ApiResponse.badRequest(
        "teamId e userId são obrigatórios para remover um membro específico",
      );
    }

    const member = await teamService.removeMember(teamId, userId);

    if (!member) {
      return ApiResponse.notFound("Membro não encontrado na equipe");
    }

    logger.info("Membro removido da equipe", { teamId, userId });

    return ApiResponse.noContent();
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/team_members/route.ts#DELETE");
  }
}
