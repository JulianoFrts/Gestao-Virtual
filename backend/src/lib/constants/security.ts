// =============================================
// 1. CARGOS DE ELITE (GOD ROLES)
// =============================================
export const GOD_ROLES = ["HELPER_SYSTEM", "SUPER_ADMIN_GOD"] as const;

// =============================================
// 2. DONOS DO SISTEMA (SYSTEM OWNERS)
// =============================================
export const SYSTEM_OWNERS = [
  "HELPER_SYSTEM",
  "SUPER_ADMIN_GOD",
  "SOCIO_DIRETOR",
  "ADMIN",
  "TI_SOFTWARE",
] as const;

export const MANAGEMENT_ROLES = [
  ...SYSTEM_OWNERS,
  "GESTOR_PROJECT",
  "GESTOR_CANTEIRO",
  "MODERATOR",
  "MANAGER",
] as const;

export const FIELD_ROLES = [
  ...MANAGEMENT_ROLES,
  "SUPERVISOR",
  "WORKER",
  "USER",
  "TECHNICIAN",
  "OPERATOR",
] as const;

// =============================================
// 3. MAPA DE FLAGS POR ROLE INDIVIDUAL
// =============================================
// Cada role define suas flags exclusivas.
// Roles God ("*") ignoram toda verificação granular.
// O helper getFlagsForRole() resolve a herança hierárquica.

export const ROLE_FLAGS: Record<string, readonly string[]> = {
  // --- GOD TIER (Acesso Total) ---
  HELPER_SYSTEM: ["*"],
  SUPER_ADMIN_GOD: ["*"],

  // --- EXECUTIVE TIER (Diretoria / Gestão Global) ---
  SOCIO_DIRETOR: [
    "users.manage",
    "companies.manage",
    "projects.manage",
    "audit_logs.view",
    "db_hub.manage",
    "custom_su.manage",
    "settings.mfa",
    "gapo.view",
    "showAdminMenu",
    "showMaintenance",
    "functions.manage",
    // Management flags (herança direta)
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    // Worker flags (herança direta)
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  ADMIN: [
    "users.manage",
    "companies.manage",
    "projects.manage",
    "audit_logs.view",
    "custom_su.manage",
    "settings.mfa",
    "gapo.view",
    "showAdminMenu",
    "functions.manage",
    // Management flags
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  TI_SOFTWARE: [
    "users.manage",
    "db_hub.manage",
    "audit_logs.view",
    "custom_su.manage",
    "settings.mfa",
    "showAdminMenu",
    "showMaintenance",
    "functions.manage",
    // Management flags
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  // --- MANAGEMENT TIER (Gestão Operacional) ---
  MODERATOR: [
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    "showAdminMenu",
    "functions.manage",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  MANAGER: [
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  GESTOR_PROJECT: [
    "projects.view",
    "projects.progress",
    "sites.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    "functions.manage",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  GESTOR_CANTEIRO: [
    "projects.view",
    "sites.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  // --- OPERATIONAL TIER (Campo / Supervisão) ---
  SUPERVISOR: [
    "projects.view",
    "sites.view",
    "team_composition",
    "work_progress.view",
    // Worker flags
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ],

  TECHNICIAN: [
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
    "projects.view",
  ],

  OPERATOR: ["clock", "daily_reports", "time_records.view", "settings.profile"],

  // --- BASE TIER ---
  WORKER: ["clock", "daily_reports", "time_records.view", "settings.profile"],

  USER: ["settings.profile"],

  VIEWER: [],
} as const;

// =============================================
// 4. BACKWARD COMPATIBILITY (deprecated)
// =============================================
// Mantém o antigo CAPABILITY_FLAGS para não quebrar imports existentes.
// Novos consumidores devem usar ROLE_FLAGS + getFlagsForRole().

/** @deprecated Use ROLE_FLAGS e getFlagsForRole() */
export const CAPABILITY_FLAGS = {
  GOD: ["*"] as string[],
  SYSTEM_OWNER: [
    "users.manage",
    "companies.manage",
    "projects.manage",
    "audit_logs.view",
    "db_hub.manage",
    "custom_su.manage",
    "settings.mfa",
    "gapo.view",
    "showAdminMenu",
    "showMaintenance",
  ] as string[],
  MANAGEMENT: [
    "projects.view",
    "projects.progress",
    "sites.view",
    "companies.view",
    "team_composition",
    "employees.manage",
    "viewer_3d.view",
    "work_progress.view",
  ] as string[],
  WORKER: [
    "clock",
    "daily_reports",
    "time_records.view",
    "settings.profile",
  ] as string[],
};

// =============================================
// 5. NÍVEIS DE SEGURANÇA (RANKS)
// =============================================
export const SECURITY_RANKS = {
  MASTER: 1500,
  GLOBAL: 1000,
  ADMIN: 900,
  MANAGEMENT: 500,
  OPERATIONAL: 150,
} as const;

// =============================================
// 6. HELPERS
// =============================================

/**
 * Retorna as flags configuradas para uma role específica.
 * Se a role não existir no mapa, retorna array vazio (fail-safe).
 */
export const getFlagsForRole = (role: string): readonly string[] => {
  const r = (role || "").toUpperCase();
  return ROLE_FLAGS[r] || [];
};

/**
 * Verifica se uma role tem acesso total (wildcard).
 */
export const hasWildcardAccess = (role: string): boolean => {
  const flags = getFlagsForRole(role);
  return flags.includes("*");
};

/**
 * Verifica se uma ROLE pertence ao grupo GOD
 */
export const isGodRole = (role: string): boolean => {
  const r = (role || "").toUpperCase();
  return GOD_ROLES.includes(r as any);
};

/**
 * Verifica se uma ROLE pertence ao grupo de proprietários do sistema
 */
export const isSystemOwner = (role: string): boolean => {
  const r = (role || "").toUpperCase();
  return SYSTEM_OWNERS.includes(r as any);
};
