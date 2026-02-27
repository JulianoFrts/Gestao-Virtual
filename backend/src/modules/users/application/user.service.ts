import { UserRepository } from "../domain/user.repository";
import { SystemAuditRepository } from "../../audit/domain/system-audit.repository";
import {
  UserEntity,
  UserFiltersDTO,
  CreateUserDTO,
  UpdateUserDTO,
} from "../domain/user.dto";
import { isSystemOwner } from "@/lib/constants/security";
import { prisma } from "@/lib/prisma/client";
import { UserPermissionService } from "./user-permission.service";
import { UserSecurityService } from "./user-security.service";
import { UserLegacyService } from "./user-legacy.service";
import { PrismaPermissionRepository } from "../infrastructure/prisma-permission.repository";
import { UserMapper } from "./user.mapper";
import { invalidateSessionCache } from "@/lib/auth/session";
import { RandomProvider, SystemRandomProvider } from "@/lib/utils/random-provider";
import { TimeProvider, SystemTimeProvider } from "@/lib/utils/time-provider";

interface LogAuditParams {
  action: string;
  entity: string;
  entityId: string;
  newValues?: Record<string, unknown> | null;
  oldValues?: Record<string, unknown> | null;
  performerId?: string;
}

import { UserAddressService } from "./user-address.service";

export class UserService {
  private readonly permissionService: UserPermissionService;
  private readonly securityService: UserSecurityService;
  private readonly legacyService: UserLegacyService;
  private readonly addressService: UserAddressService;

  constructor(
    private readonly repository: UserRepository,
    private readonly auditRepository?: SystemAuditRepository,
    private readonly randomProvider: RandomProvider = new SystemRandomProvider(),
    private readonly timeProvider: TimeProvider = new SystemTimeProvider(),
  ) {
    const permissionRepository = new PrismaPermissionRepository();
    this.permissionService = new UserPermissionService(permissionRepository);
    this.securityService = new UserSecurityService(repository, auditRepository);
    this.legacyService = new UserLegacyService(repository);
    this.addressService = new UserAddressService(repository);
  }

  // =============================================
  // CRUD CORE
  // =============================================

  async listUsers(params: {
    where: UserFiltersDTO;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: string;
    select?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.repository.findAll({
        where: params.where,
        skip,
        take: params.limit,
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder || "asc" }
          : { affiliation: { hierarchyLevel: "desc" } },
        select: params.select,
      }),
      this.repository.count(params.where),
    ]);

    return UserMapper.toPaginatedDTO(items, total, params.page, params.limit);
  }

  async getUserById(
    id: string,
    select?: Record<string, unknown>,
  ): Promise<UserEntity> {
    const user = await this.repository.findById(id, select);
    if (!user) throw new Error("User not found");
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findByEmail(email);
  }

  async createUser(
    data: CreateUserDTO,
    select?: Record<string, unknown>,
    performerId?: string,
  ): Promise<UserEntity> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.repository.findByEmail(normalizedEmail);
    if (existing) throw new Error("Email already exists");

    const passwordToHash =
      data.password || this.randomProvider.nextString(10);
    const hashedPassword =
      await this.securityService.hashPassword(passwordToHash);

    const role = data.role || "OPERATIONAL";
    const hierarchyLevel = await this.permissionService.getRankByRole(role);

    const newUser = await this.repository.create(
      {
        ...data,
        email: normalizedEmail,
        password: hashedPassword,
        hierarchyLevel: data.hierarchyLevel || hierarchyLevel,
        permissions: data.permissions || {},
        status: data.status || "ACTIVE",
      },
      select,
    );

    await this.logAudit({
      action: "CREATE",
      entity: "User",
      entityId: newUser.id,
      newValues: data as unknown,
      performerId,
    });
    return newUser;
  }

  async updateUser(
    id: string,
    data: UpdateUserDTO,
    select?: Record<string, unknown>,
    performerId?: string,
  ): Promise<Record<string, unknown>> {
    // 1. Verificar existência e dados atuais
    const existing = await this.repository.findById(id, {
      id: true,
      name: true,
      authCredential: { select: { email: true, role: true, isSystemAdmin: true } },
      affiliation: {
        select: {
          companyId: true,
          projectId: true,
          siteId: true,
          hierarchyLevel: true,
        },
      },
    });
    if (!existing) throw new Error("User not found");

    const updateData = { ...data };

    // 2. Segurança de Hierarquia e Regras Críticas
    if (performerId) {
      const existingLevel = existing.affiliation?.hierarchyLevel || 0;
      await this.securityService.validateHierarchySovereignty(
        performerId,
        id,
        existingLevel,
      );

      if (
        updateData.role &&
        updateData.role !== existing.authCredential?.role
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
          !!existing.authCredential?.isSystemAdmin,
        );
      }
    }

    // 3. Preparação e Senha
    if (updateData.password) {
      updateData.password = await this.securityService.hashPassword(
        updateData.password,
      );
    }

    // 4. Persistência de Segurança e Administração (Campos Críticos)
    const securityFields: (keyof UpdateUserDTO)[] = ["email", "password", "role", "status", "isSystemAdmin", "permissions"];
    const securityUpdate: UpdateUserDTO = {};
    let hasSecurityUpdate = false;

    for (const key of securityFields) {
      if (updateData[key] !== undefined) {
        (securityUpdate as any)[key] = updateData[key];
        hasSecurityUpdate = true;
        delete updateData[key]; // Remover para não processar no granular
      }
    }

    if (hasSecurityUpdate) {
      await this.repository.update(id, securityUpdate);
    }

    // 5. Persistência Granular (Demais campos: endereço, afiliação, etc)
    const report = await this.addressService.processGranularUpdates(id, existing, updateData);

    // 6. AuditLog e Retorno
    const finalUser = await this.repository.findById(id, select);
    await this.logAudit({
      action: "UPDATE",
      entity: "User",
      entityId: id,
      newValues: data as unknown,
      oldValues: existing as unknown,
      performerId,
    });

    return {
      ...UserMapper.toDTO(finalUser),
      _report: report,
      _partial: report.failed.length > 0,
    };
  }

  /**
   * Atualização em massa de usuários otimizada.
   * Utiliza transação única no banco de dados para garantir performance e atomicidade.
   */
  async bulkUpdateUsers(
    ids: string[],
    data: UpdateUserDTO,
    performerId: string,
  ): Promise<{ count: number }> {
    if (!ids.length) return { count: 0 /* literal */ };

    // 1. Auditoria da Ação em Massa
    await this.logAudit({
      action: "BULK_UPDATE",
      entity: "User",
      entityId: `BATCH_${ids.length}`,
      newValues: data as unknown,
      performerId,
    });

    // 2. Execução via Repositório (que gerencia a transação/otimização)
    const result = await this.repository.updateMany(ids, data);

    // 3. Invalidação de Cache em Massa (Otimizada para chamada única)
    await invalidateSessionCache();

    return result;
  }

  async deleteUser(id: string, performerId?: string): Promise<void> {
    const existing = await this.getUserById(id, {
      id: true,
      name: true,
      authCredential: { select: { role: true, email: true, isSystemAdmin: true } },
      affiliation: { select: { hierarchyLevel: true } },
    });

    if (existing.authCredential?.isSystemAdmin && performerId !== id) {
      throw new Error(
        "ACESSO MESTRE: Não é possível excluir um Administrador do Sistema.",
      );
    }

    const existingRole = existing.authCredential?.role || "WORKER";
    const existingEmail = existing.authCredential?.email || "";

    if (isSystemOwner(existingRole)) {
      if (!performerId || performerId === id) {
        throw new Error(
          "Não é possível excluir a si mesmo como proprietário do sistema.",
        );
      }
      const performer = await this.getUserById(performerId, {
        id: true,
        authCredential: { select: { role: true } },
      });
      const performerRole = performer.authCredential?.role || "WORKER";
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
        existing.affiliation?.hierarchyLevel || 0,
      );
    }

    // 1. Limpar relações complexas (Mover para legacy/orchestrator para reduzir SRP)
    await this.legacyService.deleteUserRelations(id);

    // 2. Deletar entidade principal
    await this.repository.delete(id);

    if (performerId) {
      await this.logAudit({
        action: "DELETE",
        entity: "User",
        entityId: id,
        newValues: null,
        oldValues: {
          email: existingEmail,
          name: existing.name || "",
          role: existingRole,
        },
        performerId,
      });
    }
  }

  // =============================================
  // ORQUESTRAÇÃO DE PERFIL E DELEGAÇÃO
  // =============================================

  async getProfile(userId: string): Promise<Record<string, unknown>> {
    let user: UserEntity;
    const selectConfig = {
      id: true,
      name: true,
      image: true,
      authCredential: {
        select: {
          email: true,
          role: true,
          status: true,
          isSystemAdmin: true,
        },
      },
      affiliation: {
        select: {
          companyId: true,
          projectId: true,
          siteId: true,
          hierarchyLevel: true,
        },
      },
    };

    try {
      user = (await this.repository.findById(userId, selectConfig)) as UserEntity;
    } catch (error) {
      console.error("[UserService] Error fetching user profile:", error);
      throw error;
    }

    if (!user) throw new Error("User not found");

    const userRole = user.authCredential?.role || "OPERATIONAL";
    const hierarchyLevel = user.affiliation?.hierarchyLevel || 0;
    const projectId = user.affiliation?.projectId;

    const permissions = await this.permissionService.getPermissionsMap(
      userRole,
      user.id,
      projectId || undefined,
    );
    const ui = await this.permissionService.getUIFlagsMap(
      userRole,
      hierarchyLevel,
      permissions,
    );

    // Soberania de Admin: Role Centralizada OU Flag em AuthCredential
    const isSystemAdmin =
      isSystemOwner(userRole) || user.authCredential?.isSystemAdmin === true;

    return {
      ...UserMapper.toDTO(user),
      permissions,
      ui,
      isSystemAdmin,
      hierarchyLevel, // Retorna no topo para retrocompatibilidade básica
    };
  }

  async updateProfile(
    userId: string,
    data: UpdateUserDTO,
  ): Promise<Record<string, unknown>> {
    return this.updateUser(userId, data, undefined, userId);
  }

  async changePassword(
    userId: string,
    data: { currentPassword?: string; newPassword?: string; password?: string },
    performerId?: string,
  ): Promise<void> {
    return this.securityService.changePassword(userId, data, performerId);
  }

  async adminUpdateEmail(
    userId: string,
    newEmail: string,
    performerId: string,
  ): Promise<UserEntity> {
    const existing = await this.repository.findById(userId);
    if (!existing) throw new Error("Usuário não encontrado");
    if (await this.repository.findByEmail(newEmail))
      throw new Error("Email já está em uso");

    const updatedUser = await this.repository.update(userId, {
      email: newEmail,
    });

    await this.logAudit({
      action: "UPDATE_EMAIL",
      entity: "User",
      entityId: userId,
      newValues: { email: newEmail },
      oldValues: {
        email: existing.authCredential?.email || existing.cpf || "",
      },
      performerId,
    });
    return updatedUser;
  }

  async deduplicateCPFs(): Promise<number> {
    return this.repository.deduplicateCPFs();
  }

  // Proxy para permissões e UI flags (para uso externo se necessário)
  async getPermissionsMap(
    role: string,
    userId: string,
    projectId?: string,
  ): Promise<Record<string, boolean>> {
    return this.permissionService.getPermissionsMap(role, userId, projectId);
  }

  async getUIFlagsMap(
    role: string,
    hierarchyLevel?: number,
    permissions?: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    return this.permissionService.getUIFlagsMap(
      role,
      hierarchyLevel,
      permissions,
    );
  }

  // =============================================
  // LEGACY PROXIES
  // =============================================

  async listLegacyEmployees(): Promise<any[]> {
    return this.legacyService.listLegacyEmployees();
  }

  async listLegacyProfiles(params: {
    page: number;
    limit: number;
  }): Promise<any[]> {
    return this.legacyService.listLegacyProfiles(params);
  }

  // =============================================
  // AUDITORIA INTERNA
  // =============================================

  private async logAudit(params: LogAuditParams): Promise<void> {
    if (this.auditRepository && params.performerId) {
      await this.auditRepository.log({
        userId: params.performerId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        newValues: params.newValues || undefined,
        oldValues: params.oldValues || undefined,
      });
    }
  }
}
