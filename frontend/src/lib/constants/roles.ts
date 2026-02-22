import { Role } from "@/models/enums";

/**
 * Grupos de Roles para controle de acesso simplificado (RBAC)
 * Baseado na POWER_MATRIX.md e lib/constants/security.ts
 */

// Acesso Total - Ignora verificações
export const GOD_ROLES = [
  Role.SUPER_ADMIN_GOD,
  Role.TI_SOFTWARE // Frequentemente tem acesso de debug
] as string[];

// Nível Administrativo - Gestão do Sistema, Empresas e Usuários
export const ADMIN_ROLES = [
  Role.SUPER_ADMIN_GOD,
  Role.TI_SOFTWARE,
  Role.ADMIN,
  Role.SOCIO_DIRETOR,
  Role.SUPERADMIN // Alias comum
] as string[];

// Nível de Gestão - Planejamento, Projetos e Obras
export const MANAGEMENT_ROLES = [
  ...ADMIN_ROLES,
  Role.GESTOR_PROJECT,
  Role.GESTOR_CANTEIRO,
  Role.MANAGER,
  Role.COORDINATOR
] as string[];

// Nível Operacional - Supervisão e Campo
export const FIELD_ROLES = [
  ...MANAGEMENT_ROLES,
  Role.SUPERVISOR,
  Role.WORKER,
  Role.USER,
  Role.TECHNICIAN,
  Role.OPERATOR
] as string[];

// Nível de Visualização
export const VIEWER_ROLES = [
  ...FIELD_ROLES,
  Role.VIEWER,
  Role.GUEST
] as string[];
