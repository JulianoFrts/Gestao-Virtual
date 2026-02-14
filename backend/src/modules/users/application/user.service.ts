import { UserRepository } from "../domain/user.repository";
import { SystemAuditRepository } from "../../audit/domain/system-audit.repository";
import { Prisma } from "@prisma/client";
import { isGodRole, isSystemOwner, SECURITY_RANKS } from "@/lib/constants/security";
import { ROLE_LEVELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma/client";
import { UserPermissionService } from "./user-permission.service";
import { UserSecurityService } from "./user-security.service";
import { UserLegacyService } from "./user-legacy.service";

export class UserService {
  private readonly permissionService: UserPermissionService;
  private readonly securityService: UserSecurityService;
  private readonly legacyService: UserLegacyService;

  constructor(
    private readonly repository: UserRepository,
    private readonly auditRepository?: SystemAuditRepository,
  ) {
    this.permissionService = new UserPermissionService(repository);
    this.securityService = new UserSecurityService(repository, auditRepository);
    this.legacyService = new UserLegacyService(repository);
  }

  // =============================================
  // CRUD CORE
  // =============================================

  async listUsers(params: {
    where: Prisma.UserWhereInput;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: string;
    select?: Prisma.UserSelect;
  }) {
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.repository.findAll({
        where: params.where,
        skip,
        take: params.limit,
        orderBy: (params.sortBy
          ? { [params.sortBy]: params.sortOrder || "asc" }
          : [{ hierarchyLevel: "desc" }, { name: "asc" }]) as any,
        select: params.select,
      }),
      this.repository.count(params.where),
    ]);

    const flattenedItems = items.map((u) => this.flattenUser(u));
    return this.paginateResults(
      flattenedItems,
      total,
      params.page,
      params.limit,
    );
  }

  private paginateResults(
    items: any[],
    total: number,
    page: number,
    limit: number,
  ) {
    const pages = Math.ceil(total / limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Achata a estrutura aninhada do Prisma para o formato plano esperado pelo frontend
   */
  public flattenUser(user: any) {
    if (!user) return null;
    return {
      ...user,
      email: user.authCredential?.email || user.email,
      role: user.authCredential?.role || user.role,
      status: user.authCredential?.status || user.status,
      mfaEnabled: !!user.authCredential?.mfaEnabled,
      companyId: user.affiliation?.companyId || user.companyId,
      projectId: user.affiliation?.projectId || user.projectId,
      siteId: user.affiliation?.siteId || user.siteId,
      // Mantém os objetos originais caso algo precise especificamente deles
    };
  }

  async getUserById(id: string, select?: Prisma.UserSelect) {
    const user = await this.repository.findById(id, select);
    if (!user) throw new Error("User not found");
    return user;
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  async createUser(
    data: any,
    select?: Prisma.UserSelect,
    performerId?: string,
  ) {
    const existing = await this.repository.findByEmail(data.email);
    if (existing) throw new Error("Email already exists");

    const hashedPassword = await this.securityService.hashPassword(
      data.password,
    );
    const hierarchyLevel = await this.permissionService.getRankByRole(
      data.role,
    );

    const newUser = await this.repository.create(
      {
        ...data,
        password: hashedPassword,
        hierarchyLevel,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
      select,
    );

    await this.logAudit(
      "CREATE",
      "User",
      newUser.id!,
      data,
      undefined,
      performerId,
    );
    return newUser;
  }

  async updateUser(
    id: string,
    data: any,
    select?: Prisma.UserSelect,
    performerId?: string,
  ) {
    // 1. Verificar existência e dados atuais para o log de auditoria
    const existing = await this.repository.findById(id, {
      id: true,
      name: true,
      hierarchyLevel: true,
      authCredential: { select: { email: true, role: true } },
      affiliation: { select: { companyId: true, projectId: true, siteId: true } }
    });
    if (!existing) throw new Error("User not found");

    // 2. Segurança de Hierarquia
    if (performerId && performerId !== id) {
      const performer = await this.repository.findById(performerId, {
        id: true,
        hierarchyLevel: true,
        authCredential: { select: { role: true } },
      });
      if (performer) {
        const performerRole = (performer as any).authCredential?.role || "";
        const isGod = isGodRole(performerRole) || (performer as any).hierarchyLevel >= SECURITY_RANKS.MASTER;
        
        const targetLevel = (existing as any).hierarchyLevel || 0;
        const performerLevel = (performer as any).hierarchyLevel || 0;

        if (!isGod && performerLevel <= targetLevel) {
          throw new Error("Soberania de Hierarquia: Você não pode modificar um usuário de nível igual ou superior ao seu.");
        }
      }
    }

    // 3. Preparação e Normalização
    const updateData = { ...data };
    
    // Tratamento de senha
    if (updateData.password) {
      updateData.password = await this.securityService.hashPassword(updateData.password);
    }

    // Tratamento de cargo e nível hierárquico
    if (updateData.role && updateData.role !== (existing as any).authCredential?.role) {
      const newLevel = await this.permissionService.getRankByRole(updateData.role);
      if (performerId) {
        const performer = await this.repository.findById(performerId, {
          id: true,
          hierarchyLevel: true,
          authCredential: { select: { role: true } },
        });
        const performerLevel = (performer as any).hierarchyLevel || 0;
        const performerRole = (performer as any).authCredential?.role || "";
        const isGod = isGodRole(performerRole) || (performer as any).hierarchyLevel >= SECURITY_RANKS.MASTER;

        if (!isGod && newLevel > performerLevel) {
          throw new Error(`Segurança: Você (Nível ${performerLevel}) não tem permissão para promover um usuário ao cargo de ${updateData.role} (Nível ${newLevel}).`);
        }
      }
      updateData.hierarchyLevel = newLevel;
    }

    // [SECURITY] Tratamento de Flag isSystemAdmin
    // Somente God Roles podem alterar essa flag crítica
    if (updateData.isSystemAdmin !== undefined && updateData.isSystemAdmin !== (existing as any).isSystemAdmin) {
       if (performerId) {
          const performer = await this.repository.findById(performerId, {
            id: true,
            hierarchyLevel: true,
            authCredential: { select: { role: true } },
          });
          const performerRole = (performer as any).authCredential?.role || "";
          const isOwner = isSystemOwner(performerRole);

          if (!isOwner) {
             throw new Error("Segurança Crítica: Apenas Super Administradores podem conceder ou revogar status de System Admin.");
          }
       }
    }

    // 4. Persistência Granular (Campo a Campo)
    const report: { success: string[], failed: { field: string, error: string }[] } = {
      success: [],
      failed: []
    };

    const fieldsToProcess = Object.keys(updateData);
    
    for (const field of fieldsToProcess) {
      try {
        let value = updateData[field];

        // 4.1 Limpeza específica de CPF e Telefone (Redundância de Segurança)
        if ((field === 'cpf' || field === 'phone') && typeof value === 'string') {
          value = value.replace(/\D/g, '');
        }

        const singleFieldUpdate = { [field]: value };

        // Validação específica de email (Unicidade)
        if (field === 'email' && value !== (existing as any).authCredential?.email) {
          const emailExists = await this.repository.findByEmail(value);
          if (emailExists) throw new Error("Email já está sendo usado por outro usuário.");
        }

        // Tenta atualizar este campo específico
        await this.repository.update(id, singleFieldUpdate);
        report.success.push(field);
      } catch (error: any) {
        const errorMsg = error.message || "Erro desconhecido";
        console.error(`[GranularUpdate] Falha no campo ${field}:`, errorMsg);
        report.failed.push({ field, error: errorMsg });

        // SE for erro de constraint única (Prisma P2002 ou mensagem similar), 
        // interrompemos o loop pois é um erro crítico de negócio
        if (errorMsg.includes('Unique constraint') || errorMsg.includes('P2002') || errorMsg.includes('já está sendo usado')) {
          console.warn('[GranularUpdate] Abortando atualização devido a erro de duplicidade crítica.');
          throw error; // Repropaga para o controlador tratar como 409 Conflict ou 400 Bad Request
        }
      }
    }

    // 5. AuditLog e Retorno
    const finalUser = await this.repository.findById(id, select);
    await this.logAudit("UPDATE", "User", id, data, existing, performerId);

    // Retorna o usuário achatado com o report de persistência
    return {
      ...(this.flattenUser(finalUser) as any),
      _report: report,
      _partial: report.failed.length > 0
    };
  }

  async deleteUser(id: string, performerId?: string) {
    const existing = await this.getUserById(id, {
      id: true,
      name: true,
      hierarchyLevel: true,
      authCredential: { select: { role: true, email: true } },
    });
    const existingRole = (existing as any).authCredential?.role || "WORKER";
    const existingEmail = (existing as any).authCredential?.email || "";

    if (isSystemOwner(existingRole)) {
      throw new Error(
        "Não é possível excluir um administrador ou proprietário do sistema via este método.",
      );
    }

    if (performerId) {
      const performer = await this.repository.findById(performerId, {
        id: true,
        hierarchyLevel: true,
        authCredential: { select: { role: true } },
      });
      if (performer) {
        const performerRole = (performer as any).authCredential?.role || "";
        const isGod = isGodRole(performerRole) || (performer as any).hierarchyLevel >= SECURITY_RANKS.MASTER;
        const targetLevel = (existing as any).hierarchyLevel || 0;
        const performerLevel = (performer as any).hierarchyLevel || 0;
        if (!isGod && performerLevel <= targetLevel) {
          throw new Error(
            "Soberania de Hierarquia: Você não tem permissão para excluir usuários de nível igual ou superior ao seu.",
          );
        }
      }
    }

    await prisma.$transaction([
      prisma.account.deleteMany({ where: { userId: id } }),
      prisma.session.deleteMany({ where: { userId: id } }),
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.teamMember.deleteMany({ where: { userId: id } }),
      prisma.timeRecord.deleteMany({ where: { userId: id } }),
      prisma.dailyReport.deleteMany({ where: { userId: id } }),
      prisma.constructionDocument.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      }),
      prisma.activitySchedule.deleteMany({ where: { createdById: id } }),
      prisma.team.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      }),
    ]);

    await this.repository.delete(id);
    if (performerId) {
      await this.logAudit(
        "DELETE",
        "User",
        id,
        null,
        { email: existingEmail, name: existing.name, role: existingRole },
        performerId,
      );
    }
  }

  // =============================================
  // ORQUESTRAÇÃO DE PERFIL E DELEGAÇÃO
  // =============================================

  async getProfile(userId: string) {
    let user;
    try {
      user = await this.repository.findById(userId, {
        id: true,
        name: true,
        image: true,
        hierarchyLevel: true,
        ...({ isSystemAdmin: true } as any),
        authCredential: {
          select: {
            email: true,
            role: true,
            status: true,
          },
        },
        affiliation: {
          select: {
            companyId: true,
            projectId: true,
            siteId: true,
          },
        },
      });
    } catch (error) {
      console.error("[UserService] Error fetching user with isSystemAdmin, falling back...", error);
      // Fallback without isSystemAdmin
      user = await this.repository.findById(userId, {
        id: true,
        name: true,
        image: true,
        hierarchyLevel: true,
        authCredential: {
          select: {
            email: true,
            role: true,
            status: true,
          },
        },
        affiliation: {
          select: {
            companyId: true,
            projectId: true,
            siteId: true,
          },
        },
      });
    }

    if (!user) throw new Error("User not found");

    const userRole = (user as any).authCredential?.role || "WORKER";
    const projectId = (user as any).affiliation?.projectId;

    const permissions = await this.permissionService.getPermissionsMap(
      userRole,
      user.id as string,
      (projectId as string) || undefined,
    );
    const ui = await this.permissionService.getUIFlagsMap(
      userRole,
      (user as any).hierarchyLevel || 0,
      permissions
    );

    // Check both: Role-based (Centralized) OR Explicit Flag in DB
    const isSystemAdmin = isSystemOwner(userRole) || (user as any).isSystemAdmin === true;

    const flattened = this.flattenUser(user);

    return {
      ...flattened,
      permissions,
      ui,
      isSystemAdmin,
    };
  }

  async updateProfile(userId: string, data: any) {
    return this.updateUser(userId, data, undefined, userId);
  }

  async changePassword(userId: string, data: any, performerId?: string) {
    return this.securityService.changePassword(userId, data, performerId);
  }

  async adminUpdateEmail(
    userId: string,
    newEmail: string,
    performerId: string,
  ) {
    const existing = await this.repository.findById(userId);
    if (!existing) throw new Error("Usuário não encontrado");
    if (await this.repository.findByEmail(newEmail))
      throw new Error("Email já está em uso");

    const updatedUser = await this.repository.update(userId, {
      email: newEmail,
    } as any);
    await this.logAudit(
      "UPDATE_EMAIL",
      "User",
      userId,
      { email: newEmail },
      { email: (existing as any).authCredential?.email || (existing as any).email },
      performerId,
    );
    return updatedUser;
  }

  async deduplicateCPFs() {
    return this.repository.deduplicateCPFs();
  }

  // Proxy para permissões e UI flags (para uso externo se necessário)
  async getPermissionsMap(role: string, userId: string, projectId?: string) {
    return this.permissionService.getPermissionsMap(role, userId, projectId);
  }

  async getUIFlagsMap(role: string, hierarchyLevel?: number, permissions?: Record<string, boolean>) {
    return this.permissionService.getUIFlagsMap(role, hierarchyLevel, permissions);
  }

  async upsertAddress(userId: string, data: any) {
    return this.repository.upsertAddress(userId, data);
  }

  // =============================================
  // LEGACY PROXIES
  // =============================================

  async listLegacyEmployees() {
    return this.legacyService.listLegacyEmployees();
  }

  async listLegacyProfiles(params: { page: number; limit: number }) {
    return this.legacyService.listLegacyProfiles(params);
  }

  // =============================================
  // AUDITORIA INTERNA
  // =============================================

  private async logAudit(
    action: string,
    entity: string,
    entityId: string,
    newValues?: any,
    oldValues?: any,
    performerId?: string,
  ) {
    if (this.auditRepository && performerId) {
      await this.auditRepository.log({
        userId: performerId,
        action,
        entity,
        entityId,
        newValues,
        oldValues,
      });
    }
  }
}
