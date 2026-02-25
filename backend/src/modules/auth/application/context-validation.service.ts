import { prisma } from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { isGodRole } from "@/lib/constants/security";

export interface SelectionContext {
  companyId?: string;
  projectId?: string;
  siteId?: string;
}

export class ContextValidationService {
  /**
   * Define quais níveis de acesso são considerados "Gestão Global" (Novas Roles Técnicas)
   */
  private readonly GLOBAL_MANAGEMENT_ROLES: Role[] = [
    "SUPER_ADMIN_GOD",
    "SYSTEM_ADMIN",
    "COMPANY_ADMIN",
  ];

  /**
   * Valida se o usuário pode acessar o contexto selecionado.
   */
  async validateUserContext(
    userId: string,
    context: SelectionContext,
  ): Promise<{ isValid: boolean; error?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        authCredential: true,
        affiliation: true,
      },
    });

    if (!user || !user.authCredential) {
      return { isValid: false, error: "Usuário não encontrado." };
    }

    const role = user.authCredential.role;

    // 1. Gestão Global: Pode escolher qualquer um
    if (this.GLOBAL_MANAGEMENT_ROLES.includes(role) || isGodRole(role)) {
      return { isValid: true };
    }

    // 2. PROJECT_MANAGER: Deve escolher dentro da sua Empresa
    if (role === "PROJECT_MANAGER") {
      if (!context.projectId)
        return {
          isValid: false,
          error: "Projeto é obrigatório para Gestor de Projeto.",
        };

      // Se já tem afiliação, valida se o projeto pertence à empresa dele
      if (
        user.affiliation?.companyId &&
        context.companyId &&
        user.affiliation.companyId !== context.companyId
      ) {
        return {
          isValid: false,
          error: "Você só pode selecionar projetos da sua empresa registrada.",
        };
      }
      return { isValid: true };
    }

    // 3. SITE_MANAGER e SUPERVISOR: Escolhem o Canteiro
    if (role === "SITE_MANAGER" || role === "SUPERVISOR") {
      // Valida se o canteiro (se enviado) pertence ao projeto dele
      if (
        context.siteId &&
        user.affiliation?.projectId &&
        context.projectId &&
        user.affiliation.projectId !== context.projectId
      ) {
        return {
          isValid: false,
          error:
            "Você só pode selecionar canteiros dentro do seu projeto registrado.",
        };
      }
      return { isValid: true };
    }

    // 4. Outras Roles (Nível abaixo de Supervisor): Devem ter vínculos fixos
    const affiliation = user.affiliation;
    if (
      !affiliation ||
      !affiliation.companyId ||
      !affiliation.projectId ||
      !affiliation.siteId
    ) {
      // Log de Erro de Segurança
      await this.logSecurityIncident(userId, "LOGIN_BLOCKED_NO_CONTEXT", {
        message: "Usuário operacional sem Empresa/Obra/Canteiro vinculados.",
        role,
      });
      return {
        isValid: false,
        error:
          "Acesso bloqueado: Sua conta não possui Empresa, Obra ou Canteiro vinculados. Entre em contato com o suporte.",
      };
    }

    // Verifica se o que ele está tentando acessar (se enviado) bate com o fixo
    if (context.companyId && affiliation.companyId !== context.companyId)
      return {
        isValid: false,
        error: "Contexto de empresa inválido para seu usuário.",
      };
    if (context.projectId && affiliation.projectId !== context.projectId)
      return {
        isValid: false,
        error: "Contexto de obra inválido para seu usuário.",
      };
    if (context.siteId && affiliation.siteId !== context.siteId)
      return {
        isValid: false,
        error: "Contexto de canteiro inválido para seu usuário.",
      };

    return { isValid: true };
  }

  /**
   * Registra incidentes de segurança no AuditLog
   */
  private async logSecurityIncident(
    userId: string,
    action: string,
    details: any,
  ) {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: "SecurityValidation",
        newValues: details,
        ipAddress: "SystemAuth",
      },
    });
  }

  /**
   * Busca as opções disponíveis para o usuário escolher o contexto
   */
  async getAvailableContextOptions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authCredential: true, affiliation: true },
    });

    if (!user || !user.authCredential) throw new Error("User not found");

    const role = user.authCredential.role;
    const aff = user.affiliation;

    // Se Gestão Global, retorna tudo (filtrado por ativos)
    if (this.GLOBAL_MANAGEMENT_ROLES.includes(role) || isGodRole(role)) {
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      const projects = await prisma.project.findMany({
        where: { status: "active" },
        select: { id: true, name: true, companyId: true },
      });
      const sites = await prisma.site.findMany({
        select: { id: true, name: true, projectId: true },
      });
      return { type: "GLOBAL", companies, projects, sites };
    }

    // Gestor de Projeto: Projetos da sua empresa
    if (role === "PROJECT_MANAGER" && aff?.companyId) {
      const projects = await prisma.project.findMany({
        where: { companyId: aff.companyId, status: "active" },
        select: { id: true, name: true, companyId: true },
      });
      return { type: "PROJECT_MANAGER", projects, companyId: aff.companyId };
    }

    // Gestor de Canteiro/Supervisor: Canteiros do seu projeto
    if (
      (role === "SITE_MANAGER" || role === "SUPERVISOR") &&
      aff?.projectId
    ) {
      const sites = await prisma.site.findMany({
        where: { projectId: aff.projectId },
        select: { id: true, name: true, projectId: true },
      });
      const project = await prisma.project.findUnique({
        where: { id: aff.projectId },
        select: { companyId: true },
      });
      return {
        type: "SITE_MANAGER",
        sites,
        projectId: aff.projectId,
        companyId: project?.companyId,
      };
    }

    // Outros: Retorna o fixo
    return {
      type: "FIXED",
      companyId: aff?.companyId,
      projectId: aff?.projectId,
      siteId: aff?.siteId,
    };
  }

  /**
   * Registra a seleção de contexto no AuditLog
   */
  async logContextSelection(userId: string, context: SelectionContext) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CONTEXT_SELECTED",
        entity: "Auth",
        newValues: context as any,
        ipAddress: "SystemAuth",
      },
    });
  }
}
