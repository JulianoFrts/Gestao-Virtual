import { WorkStageRepository } from "../domain/work-stage.repository";

export class WorkStageSecurityService {
  constructor(private readonly repository: WorkStageRepository) {}

  async validateAccess(
    params: { siteId?: string | null; projectId?: string | null },
    securityContext: unknown,
  ): Promise<void> {
    if (!securityContext) return;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      securityContext.role,
      securityContext.hierarchyLevel,
      securityContext.permissions,
    );

    if (isGlobal) return;

    const companyId = securityContext.companyId;

    if (params.siteId && !["all", "none"].includes(params.siteId)) {
      const hasAccess = await this.repository.verifySiteAccess(
        params.siteId,
        companyId,
      );
      if (!hasAccess)
        throw new Error("Forbidden: Site não pertence à sua empresa");
    } else if (params.projectId && params.projectId !== "all") {
      const hasAccess = await this.repository.verifyProjectAccess(
        params.projectId,
        companyId,
      );
      if (!hasAccess)
        throw new Error("Forbidden: Projeto não pertence à sua empresa");
    }
  }

  async validateStageAccess(
    stageId: string,
    securityContext: unknown,
  ): Promise<void> {
    if (!securityContext) return;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      securityContext.role,
      securityContext.hierarchyLevel,
      securityContext.permissions,
    );

    if (isGlobal) return;

    const hasAccess = await this.repository.verifyStageAccess(
      stageId,
      securityContext.companyId,
    );
    if (!hasAccess)
      throw new Error("Forbidden: Etapa não pertence à sua empresa");
  }

  async validateStageAccessBulk(
    stageIds: string[],
    securityContext: unknown,
  ): Promise<void> {
    if (!securityContext) return;

    const { isGlobalAdmin } = await import("@/lib/auth/session");
    const isGlobal = isGlobalAdmin(
      securityContext.role,
      securityContext.hierarchyLevel,
      securityContext.permissions,
    );

    if (isGlobal) return;

    const hasAccess = await this.repository.verifyStageAccessBulk(
      stageIds,
      securityContext.companyId,
    );
    if (!hasAccess)
      throw new Error(
        "Forbidden: Uma ou mais etapas não pertencem à sua empresa",
      );
  }

  async isGlobal(securityContext: unknown): Promise<boolean> {
    if (!securityContext) return true; // Default to global if no context (internal call)
    const { isGlobalAdmin } = await import("@/lib/auth/session");
    return isGlobalAdmin(
      securityContext.role,
      securityContext.hierarchyLevel,
      securityContext.permissions,
    );
  }
}
