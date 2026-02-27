import { isGodRole, isSystemOwner, getFlagsForRole, hasWildcardAccess, SECURITY_RANKS } from "@/lib/constants/security";
import { CONSTANTS, ROLE_LEVELS } from "@/lib/constants";
import { PermissionRepository } from "../domain/permission.repository";

export class UserPermissionService {
  constructor(private readonly repository: PermissionRepository) { }

  async getRankByRole(role: string): Promise<number> {
    try {
      const r = String(role || "OPERATIONAL").toUpperCase();
      
      // Mapeamento direto de Enum -> Chave de Configuração
      const map: Record<string, string> = {
        "HELPER_SYSTEM": "helper_system",
        "ADMIN": "admin",
        "TI_SOFTWARE": "ti_software",
        "COMPANY_ADMIN": "company_admin",
        "PROJECT_MANAGER": "project_manager",
        "SITE_MANAGER": "site_manager",
        "SUPERVISOR": "supervisor",
        "OPERATIONAL": "operational",
        "VIEWER": "viewer"
      };

      const configKey = map[r] || r.toLowerCase();
      return ROLE_LEVELS[configKey as keyof typeof ROLE_LEVELS] || 100;
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

      // 1. Matriz de Nível
      const level = await this.repository.findLevelByName(role);
      if (level?.id) {
        const matrixData = await this.repository.findMatrixByLevelId(level.id);
        this.applyMatrixToMap(matrixData, permissionsMap);
      }

      // 2. Dashboard e Flags Fixas
      permissionsMap["dashboard"] = true;
      getFlagsForRole(currentRoleUpper).forEach(f => { permissionsMap[f] = true; });

      if (hasWildcardAccess(currentRoleUpper) || isSystemOwner(currentRoleUpper)) {
        permissionsMap["system.is_protected"] = true;
      }

      // 3. Overrides de Usuário
      const user = await this.repository.findUserWithPermissions(userId);
      if (user?.permissions && typeof user.permissions === 'object') {
        this.applyOverridesToMap(user.permissions as Record<string, any>, permissionsMap);
      }

      // 4. Delegações de Projeto
      if (projectId && userId && user?.functionId) {
        const delegatedPerms = await this.repository.findProjectDelegations(projectId, user.functionId as string);
        this.applyMatrixToMap(delegatedPerms, permissionsMap);
      }
    } catch (err) {
      console.error("[UserPermissionService] Failed to compute permissionsMap:", err);
    }

    return permissionsMap;
  }

  private applyMatrixToMap(matrixData: unknown[], map: Record<string, boolean>): void {
    if (!matrixData) return;

    for (const element of matrixData) {
      const moduleCode = element.permissionModule?.code;
      if (!moduleCode) continue;

      map[moduleCode] = element.isGranted;
      if (element.isGranted && moduleCode.includes(".")) {
        map[moduleCode.split(".")[0]] = true;
      }
    }
  }

  private applyOverridesToMap(overrides: Record<string, any>, map: Record<string, boolean>): void {
    if (!overrides) return;

    for (const [code, isGranted] of Object.entries(overrides)) {
      if (typeof isGranted !== "boolean") continue;

      map[code] = isGranted;
      if (isGranted && code.includes(".")) {
        map[code.split(".")[0]] = true;
      }
    }
  }

  async getUIFlagsMap(
    role: string,
    hierarchyLevel?: number,
    permissions?: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    const uiMap: Record<string, boolean> = {};
    const r = (role || "WORKER").toUpperCase();
    
    // Garantir rank se hierarchyLevel vier nulo ou zero (comum em refresh parcial)
    let level = hierarchyLevel || 0;
    if (level === 0) {
      level = await this.getRankByRole(r);
    }
    
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
    uiMap["map.canConfigCables"] = level >= CONSTANTS.ROLE_LEVELS.manager || isGod || !!perms["map.manage"];
    uiMap["map.canEditTechnicalData"] = level >= CONSTANTS.ROLE_LEVELS.gestor_canteiro || isGod || !!perms["map.edit"];
    uiMap["map.viewAdvancedLayers"] = level >= CONSTANTS.ROLE_LEVELS.technician || isHighLevel;

    return uiMap;
  }
}
