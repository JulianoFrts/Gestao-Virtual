import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth, requireAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import { z } from "zod";
import { ProjectService } from "@/modules/projects/application/project.service";
import { PrismaProjectRepository } from "@/modules/projects/infrastructure/prisma-project.repository";

const updateProjectSchema = z.object({
  companyId: z.string().uuid().optional(),
  name: z.string().min(2).max(255).optional(),
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAuth();

    const project = await projectService.getProjectById(id, defaultInclude);

    return ApiResponse.json(project);
  } catch (error) {
    logger.error("Erro ao buscar projeto", { projectId: id, error });
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const updateData = {
      ...data,
      startDate: data.startDate
        ? new Date(data.startDate)
        : data.startDate === null
          ? null
          : undefined,
      endDate: data.endDate
        ? new Date(data.endDate)
        : data.endDate === null
          ? null
          : undefined,
    } as any;

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    await requireAdmin();

    await projectService.deleteProject(id);

    logger.info("Projeto removido", { projectId: id });

    return ApiResponse.noContent();
  } catch (error) {
    logger.error("Erro ao remover projeto", { projectId: id, error });
    return handleApiError(error);
  }
}
