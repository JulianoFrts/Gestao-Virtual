import {
  isGodRole,
  isSystemOwner,
  SECURITY_RANKS,
} from "@/lib/constants/security";

/**
 * Verifica se o usuário é administrador com base no cargo ou nível de hierarquia
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
