import { isGodRole, isSystemOwner, getFlagsForRole, hasWildcardAccess, SECURITY_RANKS } from "@/lib/constants/security";
import { ROLE_LEVELS } from "@/lib/constants";
import { UserRepository } from "../domain/user.repository";

export class UserPermissionService {
  constructor(private readonly repository: UserRepository) {}

  async getRankByRole(role: string): Promise<number> {
    try {
      const roleLower = String(role || "user").toLowerCase();
      return ROLE_LEVELS[roleLower as keyof typeof ROLE_LEVELS] || 100;
    } catch (err) {
      console.error(
        "[UserPermissionService] Failed to get rank for role:",
        role,
        err,
      );
      return 100;
    }
  }

  async getPermissionsMap(
    role: string,
    userId: string,
    projectId?: string,
  ): Promise<Record<string, boolean>> {
    const permissionsMap: Record<string, boolean> = {};

    try {
      const currentRoleUpper = (role || "WORKER").toUpperCase();
      const prisma = (this.repository as any).prisma;

      // 1. Buscar o ID do nível de permissão baseado no nome da role
      const level = await prisma.permissionLevel.findFirst({
        where: {
          OR: [{ name: currentRoleUpper }, { name: role }],
        },
        select: { id: true },
      });

      if (level?.id) {
        // 2. Buscar a matriz de permissões para este nível
        const matrixData = await prisma.permissionMatrix.findMany({
          where: { levelId: level.id },
          include: {
            module: {
              select: { code: true },
            },
          },
        });

        // 3. Montar o mapa de permissões
        if (matrixData) {
          matrixData.forEach((item: any) => {
            const moduleCode = item.module?.code;
            if (moduleCode) {
              permissionsMap[moduleCode] = item.isGranted;
              if (moduleCode.includes(".")) {
                const [base] = moduleCode.split(".");
                if (item.isGranted) permissionsMap[base] = true;
              }
            }
          });
        }
      }

      // 3.4. Garantir acesso básico ao dashboard para todos os logados
      permissionsMap["dashboard"] = true;

      // 3.5. INJEÇÃO DE FLAGS POR ROLE (ROLE_FLAGS)
      // Cada role já possui suas flags individuais definidas em ROLE_FLAGS.
      const roleFlags = getFlagsForRole(currentRoleUpper);
      roleFlags.forEach(f => { permissionsMap[f] = true; });

      // Escudo Dourado: roles God e System Owners
      if (hasWildcardAccess(currentRoleUpper)) {
        permissionsMap["system.is_protected"] = true;
      } else if (isSystemOwner(currentRoleUpper)) {
        permissionsMap["system.is_protected"] = true;
      }

      // 4. Buscar Permissões Customizadas do Usuário (Overrides Diretos)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          functionId: true,
          permissions: true 
        },
      });

      // 4.1. Aplicar Overrides Individuais (O campo 'permissions' no DB sempre ganha)
      if (user?.permissions && typeof user.permissions === 'object') {
        const customPerms = user.permissions as Record<string, any>;
        Object.entries(customPerms).forEach(([code, isGranted]) => {
          if (typeof isGranted === 'boolean') {
            permissionsMap[code] = isGranted;
            if (isGranted && code.includes(".")) {
               const [base] = code.split(".");
               permissionsMap[base] = true;
            }
          }
        });
      }

      // 5. Buscar Permissões Delegadas por Cargo no Projeto
      if (projectId && userId && user?.functionId) {
          const delegatedPerms =
            await prisma.projectPermissionDelegation.findMany({
              where: {
                projectId,
                jobFunctionId: user.functionId,
              },
              include: {
                module: { select: { code: true } },
              },
            });

          delegatedPerms.forEach((item: any) => {
            const moduleCode = item.module?.code;
            if (moduleCode) {
              if (item.isGranted) {
                permissionsMap[moduleCode] = true;
                if (moduleCode.includes(".")) {
                  const [base] = moduleCode.split(".");
                  permissionsMap[base] = true;
                }
              }
            }
          });
      }
    } catch (err) {
      console.error(
        "[UserPermissionService] Failed to compute permissionsMap:",
        err,
      );
    }

    return permissionsMap;
  }

  async getUIFlagsMap(
    role: string,
    hierarchyLevel?: number,
    permissions?: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    const uiMap: Record<string, boolean> = {};
    const r = (role || "WORKER").toUpperCase();
    const level = hierarchyLevel || 0;
    const perms = permissions || {};

    // Flags de Nível Administrativo (Soberania do Backend)
    const isGod = isGodRole(r);
    const isOwner = isSystemOwner(r);
    
    // showAdminMenu liberado por Role (Admin+) OU por permissão individual OU Rank Global
    const isHighLevel = isOwner || level >= SECURITY_RANKS.ADMIN || !!perms["users.manage"] || !!perms["companies.manage"];
    const isCorporate =
      isHighLevel || level >= SECURITY_RANKS.GLOBAL || !!perms["projects.manage"];
    const isManagement =
      isCorporate || level >= SECURITY_RANKS.MANAGEMENT || !!perms["projects.view"];

    // Injeção de flags por Role Individual (ROLE_FLAGS)
    const roleFlags = getFlagsForRole(r);
    roleFlags.forEach(f => {
      if (f !== "*") uiMap[f] = true;
    });

    // Overrides e Flags Específicas
    uiMap["showAdminMenu"] = isHighLevel || !!uiMap["showAdminMenu"];
    uiMap["showMaintenance"] = isGod || !!perms["custom_su.manage"] || !!uiMap["showMaintenance"];
    uiMap["showProjectManagement"] = isManagement || !!uiMap["projects.manage"];
    uiMap["showAuditLogs"] = isHighLevel || !!uiMap["audit_logs.view"];
    uiMap["canEditSensitiveData"] = level >= SECURITY_RANKS.GLOBAL || isGod;

    // Flags de Mapa e Interface Técnica
    uiMap["map.canConfigCables"] = level >= 850 || isGod || !!perms["map.manage"];
    uiMap["map.canEditTechnicalData"] = level >= 700 || isGod || !!perms["map.edit"];
    uiMap["map.viewAdvancedLayers"] = level >= 400 || isHighLevel;

    return uiMap;
  }
}
