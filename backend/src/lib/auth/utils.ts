import { isGodRole, isSystemOwner, SECURITY_RANKS } from "@/lib/constants/security";

/**
 * Verifica se o usuário é administrador com base no cargo ou nível de hierarquia
 */
export function isUserAdmin(role?: string, hierarchyLevel?: number): boolean {
  if (hierarchyLevel !== undefined && hierarchyLevel >= SECURITY_RANKS.ADMIN) return true;
  return isSystemOwner(role || "");
}
