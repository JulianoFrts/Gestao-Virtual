import {
  isGodRole,
  isSystemOwner,
  SECURITY_RANKS,
} from "@/lib/constants/security";

/**
 * Verifica se o usuário é administrador com base no cargo ou nível de hierarquia
 * Usado principalmente para UI/UX e permissões de módulo
 */
export function isUserAdmin(
  role?: string,
  hierarchyLevel?: number,
  permissions?: Record<string, boolean>,
): boolean {
  if (hierarchyLevel !== undefined && hierarchyLevel >= SECURITY_RANKS.ADMIN)
    return true;
  if (permissions?.["system.full_access"] || permissions?.["*"]) return true;
  return isSystemOwner(role || "");
}

/**
 * Verifica se o usuário é um Administrador Global (God/System Owner nível Master)
 * Apenas usuários neste nível podem ignorar travas de escopo (Multi-tenancy)
 */
export function isGlobalAdmin(
  role?: string,
  hierarchyLevel?: number,
  permissions?: Record<string, boolean>,
): boolean {
  // Rank 1000+ (GLOBAL) ou Master (1500)
  if (hierarchyLevel !== undefined && hierarchyLevel >= SECURITY_RANKS.GLOBAL)
    return true;

  if (permissions?.["*"]) return true;

  // SYSTEM_OWNERS (HELPER_SYSTEM, SUPER_ADMIN_GOD, etc)
  return isGodRole(role || "");
}
