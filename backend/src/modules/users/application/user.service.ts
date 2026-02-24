import { UserRepository } from "../domain/user.repository";
import { SystemAuditRepository } from "../../audit/domain/system-audit.repository";
import { type Prisma } from "@prisma/client";
import { isSystemOwner } from "@/lib/constants/security";
import { prisma } from "@/lib/prisma/client";
import { UserPermissionService } from "./user-permission.service";
import { UserSecurityService } from "./user-security.service";
import { UserLegacyService } from "./user-legacy.service";
import { PrismaPermissionRepository } from "../infrastructure/prisma-permission.repository";
import { UserMapper } from "./user.mapper";
import { invalidateSessionCache } from "@/lib/auth/session";

interface LogAuditParams {
  action: string;
  entity: string;
  entityId: string;
  newValues?: any;
  oldValues?: any;
  performerId?: string;
}

export class UserService {
  private readonly permissionService: UserPermissionService;
  private readonly securityService: UserSecurityService;
  private readonly legacyService: UserLegacyService;

  constructor(
    private readonly repository: UserRepository,
    private readonly auditRepository?: SystemAuditRepository,
  ) {
    const permissionRepository = new PrismaPermissionRepository();
    this.permissionService = new UserPermissionService(permissionRepository);
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

    return UserMapper.toPaginatedDTO(items, total, params.page, params.limit);
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
        permissions: data.permissions || {},
        status: "ACTIVE",
        emailVerified: new Date(),
      },
      select,
    );

    await this.logAudit({
      action: "CREATE",
      entity: "User",
      entityId: newUser.id!,
      newValues: data,
      performerId,
    });
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
      affiliation: {
        select: { companyId: true, projectId: true, siteId: true },
      },
    });
    if (!existing) throw new Error("User not found");

    const updateData = { ...data };

    // 2. Segurança de Hierarquia e Regras Críticas
    if (performerId) {
      await this.securityService.validateHierarchySovereignty(
        performerId,
        id,
        existing.hierarchyLevel || 0,
      );

      if (
        updateData.role &&
        updateData.role !== (existing as any).authCredential?.role
      ) {
        const newLevel = await this.permissionService.getRankByRole(
          updateData.role,
        );
        await this.securityService.validatePromotionPermission(
          performerId,
          updateData.role,
          newLevel,
        );
        updateData.hierarchyLevel = newLevel;
      }

      if (updateData.isSystemAdmin !== undefined) {
        await this.securityService.validateSystemAdminFlag(
          performerId,
          updateData.isSystemAdmin,
          (existing as any).isSystemAdmin || false,
        );
      }
    }

    // 3. Preparação e Senha
    if (updateData.password) {
      updateData.password = await this.securityService.hashPassword(
        updateData.password,
      );
    }

    // 4. Persistência Granular
    const report = await this.processGranularUpdates(id, existing, updateData);

    // 5. AuditLog e Retorno
    const finalUser = await this.repository.findById(id, select);
    await this.logAudit({
      action: "UPDATE",
      entity: "User",
      entityId: id,
      newValues: data,
      oldValues: existing,
      performerId,
    });

    return {
      ...UserMapper.toDTO(finalUser),
      _report: report,
      _partial: report.failed.length > 0,
    };
  }

  private async processGranularUpdates(
    id: string,
    existing: any,
    updateData: any,
  ) {
    const report: {
      success: string[];
      failed: { field: string; error: string }[];
    } = {
      success: [],
      failed: [],
    };

    const fieldsToProcess = Object.keys(updateData);

    for (const field of fieldsToProcess) {
      try {
        let value = updateData[field];

        // Limpeza de CPF e Telefone
        if (
          (field === "cpf" || field === "phone") &&
          typeof value === "string"
        ) {
          value = value.replace(/\D/g, "");
        }

        // Validação de email único
        if (
          field === "email" &&
          value !== (existing as any).authCredential?.email
        ) {
          const emailExists = await this.repository.findByEmail(value);
          if (emailExists)
            throw new Error("Email já está sendo usado por outro usuário.");
        }

        await this.repository.update(id, { [field]: value });
        report.success.push(field);
      } catch (error: any) {
        const errorMsg = error.message || "Erro desconhecido";
        console.error(`[GranularUpdate] Falha no campo ${field}:`, errorMsg);
        report.failed.push({ field, error: errorMsg });

        if (
          errorMsg.includes("Unique constraint") ||
          errorMsg.includes("P2002") ||
          errorMsg.includes("já está sendo usado")
        ) {
          throw error;
        }
      }
    }

    return report;
  }

  /**
   * Atualização em massa de usuários.
   * Itera sobre os IDs e aplica o updateUser para cada um, garantindo auditoria e segurança.
   */
  /**
   * Atualização em massa de usuários otimizada.
   * Utiliza transação única no banco de dados para garantir performance e atomicidade.
   */
  async bulkUpdateUsers(ids: string[], data: any, performerId: string) {
    if (!ids.length) return { count: 0 };

    // 1. Auditoria da Ação em Massa
    await this.logAudit({
      action: "BULK_UPDATE",
      entity: "User",
      entityId: `BATCH_${ids.length}`,
      newValues: { ids, data },
      performerId,
    });

    // 2. Execução via Repositório (que gerencia a transação/otimização)
    const result = await this.repository.updateMany(ids, data);

    // 3. Invalidação de Cache em Massa (Otimizada para chamada única)
    await invalidateSessionCache();

    return result;
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
      // Permitir exclusão se o performer também é System Owner (ex: SuperAdminGod)
      // Apenas bloquear auto-exclusão por segurança
      if (!performerId || performerId === id) {
        throw new Error(
          "Não é possível excluir a si mesmo como proprietário do sistema.",
        );
      }
      const performer = await this.getUserById(performerId, {
        id: true,
        authCredential: { select: { role: true } },
      });
      const performerRole = (performer as any).authCredential?.role || "WORKER";
      if (!isSystemOwner(performerRole)) {
        throw new Error(
          "Apenas proprietários do sistema podem excluir outros administradores.",
        );
      }
    }

    if (performerId) {
      await this.securityService.validateHierarchySovereignty(
        performerId,
        id,
        (existing as any).hierarchyLevel || 0,
      );
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
      prisma.activitySchedule.deleteMany({ where: { createdBy: id } }),
      prisma.team.updateMany({
        where: { supervisorId: id },
        data: { supervisorId: null },
      }),
    ]);

    await this.repository.delete(id);
    if (performerId) {
      await this.logAudit({
        action: "DELETE",
        entity: "User",
        entityId: id,
        newValues: null,
        oldValues: {
          email: existingEmail,
          name: existing.name,
          role: existingRole,
        },
        performerId,
      });
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
      console.error(
        "[UserService] Error fetching user with isSystemAdmin, falling back...",
        error,
      );
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
      permissions,
    );

    // Check both: Role-based (Centralized) OR Explicit Flag in DB
    const isSystemAdmin =
      isSystemOwner(userRole) || (user as any).isSystemAdmin === true;

    return {
      ...UserMapper.toDTO(user),
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
    await this.logAudit({
      action: "UPDATE_EMAIL",
      entity: "User",
      entityId: userId,
      newValues: { email: newEmail },
      oldValues: {
        email:
          (existing as any).authCredential?.email || (existing as any).email,
      },
      performerId,
    });
    return updatedUser;
  }

  async deduplicateCPFs() {
    return this.repository.deduplicateCPFs();
  }

  // Proxy para permissões e UI flags (para uso externo se necessário)
  async getPermissionsMap(role: string, userId: string, projectId?: string) {
    return this.permissionService.getPermissionsMap(role, userId, projectId);
  }

  async getUIFlagsMap(
    role: string,
    hierarchyLevel?: number,
    permissions?: Record<string, boolean>,
  ) {
    return this.permissionService.getUIFlagsMap(
      role,
      hierarchyLevel,
      permissions,
    );
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

  private async logAudit(params: LogAuditParams) {
    if (this.auditRepository && params.performerId) {
      await this.auditRepository.log({
        userId: params.performerId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        newValues: params.newValues,
        oldValues: params.oldValues,
      });
    }
  }
}
