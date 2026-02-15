import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { ProjectService } from "@/modules/projects/application/project.service";
import { PrismaProjectRepository } from "@/modules/projects/infrastructure/prisma-project.repository";

// DI
const projectRepository = new PrismaProjectRepository();
const projectService = new ProjectService(projectRepository);

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { isUserAdmin } = await import("@/lib/auth/session");
    const isAdmin = isUserAdmin(currentUser.role);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");

    const where: any = {};
    if (projectId) {
      where.projectId = projectId;

      // Multitenancy-check
      if (!isAdmin) {
        try {
          const project = await projectService.getProjectById(projectId);
          if (project.companyId !== (currentUser as any).companyId) {
            return ApiResponse.notFound(
              "Projeto não encontrado ou acesso negado",
            );
          }
        } catch (e) {
          return ApiResponse.notFound(
            "Projeto não encontrado ou acesso negado",
          );
        }
      }
    } else if (!isAdmin) {
      // Se não passar projeto, limita aos projetos da empresa
      where.project = {
        companyId: (currentUser as any).companyId as string,
      };
    }

    const targets = await projectService.getMonthlyTargets(where);
    return ApiResponse.json(targets);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    // Here you might want to add validation with zod similar to other routes
    // Delegating creation to service
    const target = await projectService.createMonthlyTarget(body);
    return ApiResponse.json(target, "Meta mensal criada com sucesso");
  } catch (error) {
    return handleApiError(error);
  }
}
