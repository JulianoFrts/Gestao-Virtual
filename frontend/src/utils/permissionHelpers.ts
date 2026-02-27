export type UserRole =
  | "helper_system"
  | "admin"
  | "ti_software"
  | "company_admin"
  | "project_manager"
  | "site_manager"
  | "supervisor"
  | "operational"
  | "viewer"
  | string;

export const SYSTEM_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

export interface UserScope {
  id: string;
  role: string | undefined;
  companyId?: string | null;
  projectId?: string | null;
  siteId?: string | null;
  email?: string;
  isSystemAdmin?: boolean;
  hierarchyLevel?: number;
  permissionsMap?: Record<string, boolean>;
}

export const isSuperAdminGod = (profile: UserScope | undefined): boolean => {
  if (!profile) return false;

  // God Mode bypass flags
  if (profile.isSystemAdmin) return true;
  if (profile.permissionsMap?.["*"]) return true;
  if (profile.permissionsMap?.["system.full_access"]) return true;

  const role = (profile.role || "").toUpperCase();
  if (role === "HELPER_SYSTEM" || role === "ADMIN") return true;

  // Hierarchy Level God check
  if ((profile.hierarchyLevel || 0) >= 1500) return true;

  return false;
};

export const isGestaoGlobal = (profile: UserScope | undefined): boolean => {
  if (!profile) return false;

  if (isSuperAdminGod(profile)) return true;

  const role = (profile.role || "").toUpperCase();
  if (role === "TI_SOFTWARE" || role === "TISOFTWARE") return true;

  // Hierarchy Level Global check
  if ((profile.hierarchyLevel || 0) >= 1200) return true;

  return !!profile.permissionsMap?.["system.is_corporate"] || !!profile.permissionsMap?.["ui.admin_access"];
};

export const isManagementRole = (profile: UserScope | undefined): boolean => {
  if (!profile) return false;

  // Global Management (Top 3)
  if (isGestaoGlobal(profile)) return true;

  // Organizational Management (Next 3)
  const role = (profile.role || "").toUpperCase();
  const managementRoles = ["COMPANY_ADMIN", "PROJECT_MANAGER", "SITE_MANAGER"];
  if (managementRoles.includes(role)) return true;

  // Hierarchy Level Management threshold (Supervisor and up)
  if ((profile.hierarchyLevel || 0) >= 600) return true;

  return false;
};

export const isCorporateRole = (
  role: string | undefined,
  userProfile?: UserScope,
): boolean => {
  if (userProfile?.permissionsMap?.["system.is_corporate"] !== undefined) {
    return !!userProfile.permissionsMap["system.is_corporate"];
  }
  
  const r = (role || "").toUpperCase();
  // Se for uma role de gestão global ou de diretoria da empresa
  return ["HELPER_SYSTEM", "ADMIN", "TI_SOFTWARE", "COMPANY_ADMIN"].includes(r);
};

export const isProtectedUser = (user: UserScope | undefined): boolean => {
  if (!user) return false;
  // Somente o que o Backend definiu como protegido (Escudo Dourado)
  return !!user.permissionsMap?.["system.is_protected"] || !!user.isSystemAdmin || (user.hierarchyLevel || 0) >= 1500;
};

/**
 * Verifica se o usuário é um usuário de campo / nível base
 */
export const isFieldWorker = (role: string | undefined): boolean => {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "OPERATIONAL" || r === "WORKER";
};

/**
 * Verifica se o usuário é um suporte especializado do sistema.
 */
export const isHelperSystem = (profile: UserScope | undefined): boolean => {
  if (!profile) return false;
  return !!profile.permissionsMap?.["system.is_helper"] || profile.role?.toUpperCase() === "HELPER_SYSTEM";
};

/**
 * Verifica se um usuário pode gerenciar outro.
 */
export const canManageUser = (
  currentUser: UserScope,
  targetUser: UserScope,
): boolean => {
  if (isHelperSystem(targetUser)) return false;
  if (currentUser.id === targetUser.id) return true; 

  const myLevel = currentUser.hierarchyLevel || 0;
  const targetLevel = targetUser.hierarchyLevel || 0;

  if (isSuperAdminGod(currentUser)) return true;
  if (myLevel <= targetLevel) return false;

  return (
    !!currentUser.permissionsMap?.["users.manage.all"] ||
    !!currentUser.permissionsMap?.["users.manage"] ||
    !!currentUser.permissionsMap?.["users.update"]
  );
};

/**
 * Verifica se um usuário pode gerenciar um funcionário.
 */
export const canManageEmployee = (
  currentUser: UserScope,
  targetEmployee: { level?: number; companyId?: string | null },
): boolean => {
  const myLevel = currentUser.hierarchyLevel || 0;
  const targetLevel = targetEmployee.level || 0;

  if (isSuperAdminGod(currentUser)) return true;
  if (myLevel <= targetLevel) return false;

  return (
    !!currentUser.permissionsMap?.["employees.manage"] ||
    !!currentUser.permissionsMap?.["employees.manage.all"] ||
    !!currentUser.permissionsMap?.["employees.manage.create"]
  );
};

/**
 * Verifica se um usuário pode gerenciar um cargo (função).
 */
export const canManageFunction = (currentUser: UserScope): boolean => {
  if (isSuperAdminGod(currentUser)) return true;
  return (
    !!currentUser.permissionsMap?.["functions.manage"] ||
    !!currentUser.permissionsMap?.["functions.manage.read"]
  );
};

/**
 * Verifica se um usuário pode atribuir um determinado cargo.
 */
export const canAssignRole = (
  currentUser: UserScope,
  roleToAssign: string,
): boolean => {
  const role = roleToAssign.toUpperCase();
  // Ninguém pode atribuir HELPER_SYSTEM manualmente via interface comum
  if (role === "HELPER_SYSTEM") return false;
  
  if (isSuperAdminGod(currentUser)) return true;

  return !!currentUser.permissionsMap?.["roles.assign"];
};

/**
 * Verifica se um usuário pode atribuir uma empresa.
 */
export const canAssignCompany = (
  currentUser: UserScope,
  companyId: string,
): boolean => {
  if (companyId === SYSTEM_COMPANY_ID) {
    return isSuperAdminGod(currentUser);
  }
  return true;
};

/**
 * Função principal de verificação de permissão (CRUD).
 */
export const hasPermission = (
  user: UserScope | null | undefined,
  action: string,
  entity: string,
): boolean => {
  if (!user) return action === "read"; 
  if (isSuperAdminGod(user)) return true;

  const moduleMapping: Record<string, string> = {
    project: "projects",
    site: "sites",
    company: "companies",
    employee: "employees",
    user: "users",
    function: "functions",
    daily_report: "daily_reports",
    team: "team_composition",
    project_progress: "projects.progress",
    work_progress: "work_progress",
  };

  const moduleCode = moduleMapping[entity] || entity;

  if (user.permissionsMap) {
    let matrixAction = action;
    if (action === "rename" || action === "edit_config")
      matrixAction = "update";

    const permKey = `${moduleCode}.${matrixAction}`;

    if (user.permissionsMap[permKey] !== undefined) {
      return user.permissionsMap[permKey];
    }

    if (user.permissionsMap[moduleCode] !== undefined) {
      return user.permissionsMap[moduleCode];
    }
  }

  return action === "read"; 
};
