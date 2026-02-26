import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import * as authSession from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProjectService } from "@/modules/projects/application/project.service";
import { PrismaProjectRepository } from "@/modules/projects/infrastructure/prisma-project.repository";
import { VALIDATION } from "@/lib/constants";
import { ProjectEntity, UpdateProjectDTO } from "@/modules/projects/domain/project.dto";

const updateProjectSchema = z.object({
  companyId: z.string().optional(),
  name: z.string().min(2).max(VALIDATION.STRING.MAX_NAME).optional(),
  code: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  description: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  address: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
  startDate: z.preprocess(
    (val) => (val === "" || val === "0" || val === null ? null : val),
    z.union([z.string().datetime(), z.date()]).optional().nullable(),
  ),
  endDate: z.preprocess(
    (val) => (val === "" || val === "0" || val === null ? null : val),
    z.union([z.string().datetime(), z.date()]).optional().nullable(),
  ),
  plannedHours: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  estimatedCost: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Inicialização dos serviços
const projectRepository = new PrismaProjectRepository();
const projectService = new ProjectService(projectRepository);

const defaultInclude = {
  company: { select: { id: true, name: true } },
  sites: true,
  _count: { select: { userAffiliations: true, constructionDocuments: true } },
};

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    await authSession.requireAuth();

    const project = await projectService.getProjectById(id, defaultInclude) as ProjectEntity | null;
    if (!project) return ApiResponse.notFound("Projeto não encontrado");

    // Validação de Escopo
    await authSession.requireScope(
      project.companyId,
      "COMPANY",
      request,
    );

    return ApiResponse.json(project);
  } catch (error) {
    logger.error("Erro ao buscar projeto", { projectId: id, error });
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    await authSession.requirePermission("projects.manage", request);

    const existingProject = await projectService.getProjectById(id) as ProjectEntity | null;
    if (!existingProject) return ApiResponse.notFound("Projeto não encontrado");

    // Validação de Escopo
    await authSession.requireScope(
      existingProject.companyId,
      "COMPANY",
      request,
    );

    const body = await request.json();
    const projectData = updateProjectSchema.parse(body);

    const updateData: UpdateProjectDTO = {
      ...projectData,
      startDate: projectData.startDate
        ? new Date(projectData.startDate as string)
        : projectData.startDate === null
          ? undefined
          : undefined,
      endDate: projectData.endDate
        ? new Date(projectData.endDate as string)
        : projectData.endDate === null
          ? undefined
          : undefined,
    };

    const project = await projectService.updateProject(
      id,
      updateData,
      defaultInclude,
    );

    logger.info("Projeto atualizado", { projectId: project.id });

    return ApiResponse.json(project, "Projeto atualizado com sucesso");
  } catch (error) {
    logger.error("Erro ao atualizar projeto", { projectId: id, error });
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    await authSession.requireAdmin(); // Deletar projeto exige admin sistêmico ou alta hierarquia

    const existingProject = await projectService.getProjectById(id) as ProjectEntity | null;
    if (!existingProject) return ApiResponse.notFound("Projeto não encontrado");

    // Validação de Escopo (redundante se requireAdmin for GodRole, mas bom para defesa em profundidade)
    await authSession.requireScope(
      existingProject.companyId,
      "COMPANY",
      request,
    );

    await projectService.deleteProject(id);

    logger.info("Projeto removido", { projectId: id });

    return ApiResponse.noContent();
  } catch (error) {
    logger.error("Erro ao remover projeto", { projectId: id, error });
    return handleApiError(error);
  }
}
