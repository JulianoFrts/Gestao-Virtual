/**
 * Constantes de Segurança e Autorização - GESTÃO VIRTUAL
 * Define roles, ranks e permissões granulares.
 */

import { ROLE_LEVELS } from "./index";

// =============================================
// 1. LISTAS DE CARGOS POR CATEGORIA
// =============================================

export const GOD_ROLES = ["HELPER_SYSTEM", "ADMIN"] as const;

export const SYSTEM_OWNERS = ["HELPER_SYSTEM", "ADMIN", "TI_SOFTWARE"] as const;

export const MANAGEMENT_ROLES = [
  ...SYSTEM_OWNERS,
  "COMPANY_ADMIN",
  "PROJECT_MANAGER",
  "SITE_MANAGER",
] as const;

export const FIELD_ROLES = [
  ...MANAGEMENT_ROLES,
  "SUPERVISOR",
  "OPERATIONAL",
  "VIEWER",
] as const;

// =============================================
// 2. MAPA DE FLAGS POR ROLE INDIVIDUAL
// =============================================

export const ROLE_FLAGS: Record<string, readonly string[]> = {
  HELPER_SYSTEM: ["*"],
  ADMIN: ["*"],

  TI_SOFTWARE: [
    "users.manage",
    "db_hub.manage",
    "audit_logs.view",
    "custom_su.manage",
    "settings.mfa",
    "showAdminMenu",
    "showMaintenance",
    "functions.manage",
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  COMPANY_ADMIN: [
    "users.manage",
    "companies.manage",
    "projects.manage",
    "audit_logs.view",
    "db_hub.manage",
    "custom_su.manage",
    "settings.mfa",
    "showAdminMenu",
    "showMaintenance",
    "functions.manage",
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  PROJECT_MANAGER: [
    "projects.view",
    "projects.progress",
    "sites.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    "functions.manage",
    "showAdminMenu",
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  SITE_MANAGER: [
    "projects.view",
    "sites.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  SUPERVISOR: [
    "team_composition",
    "work_progress.view",
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  OPERATIONAL: [
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  VIEWER: [
    "projects.view",
    "sites.view",
    "viewer_3d.view",
    "work_progress.view",
    "settings.profile",
  ],
} as const;

// =============================================
// 3. NÍVEIS DE SEGURANÇA (RANKS)
// =============================================

export const SECURITY_RANKS = {
  MASTER: ROLE_LEVELS.helper_system,
  GLOBAL: ROLE_LEVELS.admin,
  TI: ROLE_LEVELS.ti_software,
  ADMIN: ROLE_LEVELS.company_admin,
  MANAGEMENT: ROLE_LEVELS.project_manager,
  OPERATIONAL: ROLE_LEVELS.operational,
} as const;

// =============================================
// 4. HELPERS
// =============================================

export const getFlagsForRole = (role: string): readonly string[] => {
  const r = (role || "").toUpperCase();
  return ROLE_FLAGS[r] || [];
};

export const hasWildcardAccess = (role: string): boolean => {
  const flags = getFlagsForRole(role);
  return flags.includes("*");
};

export const isGodRole = (role: string): boolean => {
  const r = (role || "").toUpperCase();
  return (GOD_ROLES as readonly string[]).includes(r);
};

export const isSystemOwner = (role: string): boolean => {
  const r = (role || "").toUpperCase();
  return (SYSTEM_OWNERS as readonly string[]).includes(r);
};

// =============================================
// 5. BACKWARD COMPATIBILITY
// =============================================

export const CAPABILITY_FLAGS = {
  GOD: ["*"],
  SYSTEM_OWNER: ["users.manage", "db_hub.manage", "audit_logs.view"],
  MANAGEMENT: ["projects.view", "sites.view", "team_composition"],
  WORKER: ["clock", "daily_reports", "time_records.view"],
} as const;
