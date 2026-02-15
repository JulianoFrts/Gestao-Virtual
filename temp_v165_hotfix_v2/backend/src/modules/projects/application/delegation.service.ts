import { prisma as db } from "@/lib/prisma/client";

export class DelegationService {
  /**
   * Lista todas as delegações de um projeto.
   */
  async listDelegations(projectId: string) {
    return db.projectPermissionDelegation.findMany({
      where: { projectId },
      include: {
        jobFunction: { select: { name: true } },
        module: { select: { code: true, name: true } },
      },
    });
  }

  /**
   * Aplica um conjunto de permissões para uma função em um projeto.
   * Realiza o upsert para cada módulo.
   */
  async applyDelegation(data: {
    projectId: string;
    jobFunctionId: string;
    moduleId: string;
    isGranted: boolean;
    grantedById?: string;
  }) {
    return db.projectPermissionDelegation.upsert({
      where: {
        projectId_jobFunctionId_moduleId: {
          projectId: data.projectId,
          jobFunctionId: data.jobFunctionId,
          moduleId: data.moduleId,
        },
      },
      update: {
        isGranted: data.isGranted,
        grantedById: data.grantedById,
      },
      create: data,
    });
  }

  /**
   * Remove uma delegação específica.
   */
  async revokeDelegation(id: string) {
    return db.projectPermissionDelegation.delete({
      where: { id },
    });
  }
}
