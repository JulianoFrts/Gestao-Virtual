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
   * Define quais níveis de acesso são considerados "Gestão Global"
   */
  private readonly GLOBAL_MANAGEMENT_ROLES: Role[] = [
    "HELPER_SYSTEM",
    "SUPER_ADMIN_GOD",
    "SOCIO_DIRETOR",
    "ADMIN",
    "TI_SOFTWARE",
    "MANAGER",
    "MODERATOR",
  ];

  /**
   * Valida se o usuário pode acessar o contexto selecionado.
   */
  async validateUserContext(userId: string, context: SelectionContext): Promise<{ isValid: boolean; error?: string }> {
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

    // 2. GESTOR_PROJECT: Deve escolher dentro da sua Empresa (ou a empresa vinculada)
    if (role === "GESTOR_PROJECT") {
        if (!context.projectId) return { isValid: false, error: "Projeto é obrigatório para Gestor de Projeto." };
        
        // Se já tem afiliação, valida se o projeto pertence à empresa/projeto dele
        if (user.affiliation?.companyId && context.companyId && user.affiliation.companyId !== context.companyId) {
            return { isValid: false, error: "Você só pode selecionar projetos da sua empresa registrada." };
        }
        return { isValid: true };
    }

    // 3. GESTOR_CANTEIRO e SUPERVISOR: Escolhem o Canteiro
    if (role === "GESTOR_CANTEIRO" || role === "SUPERVISOR") {
        if (!context.siteId) return { isValid: false, error: "Canteiro é obrigatório para seu nível de acesso." };
        
        // Valida se o canteiro pertence ao projeto dele
        if (user.affiliation?.projectId && context.projectId && user.affiliation.projectId !== context.projectId) {
            return { isValid: false, error: "Você só pode selecionar canteiros dentro do seu projeto registrado." };
        }
        return { isValid: true };
    }

    // 4. Outras Roles (Nível abaixo de Supervisor): Devem ter vínculos fixos
    const affiliation = user.affiliation;
    if (!affiliation || !affiliation.companyId || !affiliation.projectId || !affiliation.siteId) {
        // Log de Erro de Segurança
        await this.logSecurityIncident(userId, "LOGIN_BLOCKED_NO_CONTEXT", {
            message: "Usuário operacional sem Empresa/Obra/Canteiro vinculados.",
            role
        });
        return { isValid: false, error: "Acesso bloqueado: Sua conta não possui Empresa, Obra ou Canteiro vinculados. Entre em contato com o suporte." };
    }

    // Verifica se o que ele está tentando acessar (se enviado) bate com o fixo
    if (context.companyId && affiliation.companyId !== context.companyId) return { isValid: false, error: "Contexto de empresa inválido para seu usuário." };
    if (context.projectId && affiliation.projectId !== context.projectId) return { isValid: false, error: "Contexto de obra inválido para seu usuário." };
    if (context.siteId && affiliation.siteId !== context.siteId) return { isValid: false, error: "Contexto de canteiro inválido para seu usuário." };

    return { isValid: true };
  }

  /**
   * Registra incidentes de segurança no AuditLog
   */
  private async logSecurityIncident(userId: string, action: string, details: any) {
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
      const companies = await prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true } });
      const projects = await prisma.project.findMany({ where: { status: "active" }, select: { id: true, name: true, companyId: true } });
      const sites = await prisma.site.findMany({ select: { id: true, name: true, projectId: true } });
      return { type: "GLOBAL", companies, projects, sites };
    }

    // Gestor de Projeto: Projetos da sua empresa
    if (role === "GESTOR_PROJECT" && aff?.companyId) {
        const projects = await prisma.project.findMany({ 
            where: { companyId: aff.companyId, status: "active" },
            select: { id: true, name: true, companyId: true }
        });
        return { type: "PROJECT_MANAGER", projects, companyId: aff.companyId };
    }

    // Gestor de Canteiro/Supervisor: Canteiros do seu projeto
    if ((role === "GESTOR_CANTEIRO" || role === "SUPERVISOR") && aff?.projectId) {
        const sites = await prisma.site.findMany({
            where: { projectId: aff.projectId },
            select: { id: true, name: true, projectId: true }
        });
        const project = await prisma.project.findUnique({ where: { id: aff.projectId }, select: { companyId: true } });
        return { type: "SITE_MANAGER", sites, projectId: aff.projectId, companyId: project?.companyId };
    }

    // Outros: Retorna o fixo
    return { 
        type: "FIXED", 
        companyId: aff?.companyId, 
        projectId: aff?.projectId, 
        siteId: aff?.siteId 
    };
  }
}
