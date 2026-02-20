export type UserRole =
  | "helper_system"
  | "super_admin_god"
  | "socio_diretor"
  | "admin"
  | "ti_software"
  | "moderator"
  | "manager"
  | "gestor_project"
  | "gestor_canteiro"
  | "supervisor"
  | "technician"
  | "operator"
  | "worker"
  | "user"
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

  // God Mode bypass flags (Somente o que o Backend disse)
  if (profile.isSystemAdmin) return true;
  if (profile.permissionsMap?.["*"]) return true;
  if (profile.permissionsMap?.["system.full_access"]) return true;

  // Hierarchy Level God check (Ainda aceitável se alinhado ao backend, mas o mapa deve bastar)
  if ((profile.hierarchyLevel || 0) >= 2000) return true;

  return false;
};

export const isGestaoGlobal = (profile: UserScope | undefined): boolean => {
  if (!profile) return false;

  if (isSuperAdminGod(profile)) return true;

  // Hierarchy Level Global check (Baseado em nível, sem hardcode de role name)
  if ((profile.hierarchyLevel || 0) >= 900) return true;

  return !!profile.permissionsMap?.["system.is_corporate"] || !!profile.permissionsMap?.["ui.admin_access"];
};

export const isCorporateRole = (
  role: string | undefined,
  userProfile?: UserScope,
): boolean => {
  if (userProfile?.permissionsMap?.["system.is_corporate"] !== undefined) {
    return !!userProfile.permissionsMap["system.is_corporate"];
  }

  return false;
};

export const isProtectedUser = (user: UserScope | undefined): boolean => {
  if (!user) return false;
  // Somente o que o Backend definiu como protegido (Escudo Dourado)
  return !!user.permissionsMap?.["system.is_protected"] || !!user.isSystemAdmin;
};

/**
 * Verifica se o usuário é um trabalhador de campo (nível base)
 */
export const isFieldWorker = (role: string | undefined): boolean => {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === "WORKER";
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
 * A decisão agora é baseada inteiramente no permissionsMap enviado pelo BackEnd.
 */
export const canManageUser = (
  currentUser: UserScope,
  targetUser: UserScope,
): boolean => {
  if (isHelperSystem(targetUser)) return false;
  if (currentUser.id === targetUser.id) return true; // Auto-edição sempre permitida

  const myLevel = currentUser.hierarchyLevel || 0;
  const targetLevel = targetUser.hierarchyLevel || 0;

  // 1. Super Admin God ignora nível
  if (isSuperAdminGod(currentUser)) return true;

  // 2. Soberania de Hierarquia: Nível deve ser estritamente superior
  if (myLevel <= targetLevel) return false;

  // 3. Verificações baseadas em permissões explícitas do BackEnd
  if (
    currentUser.permissionsMap?.["users.manage.all"] ||
    currentUser.permissionsMap?.["users.manage"]
  )
    return true;

  return (
    !!currentUser.permissionsMap?.["users.update"] ||
    !!currentUser.permissionsMap?.["users.manage"]
  );
};

/**
 * Verifica se um usuário pode gerenciar um funcionário.
 * Backend decide o acesso enviando a permissão 'employees.manage' no mapa.
 */
export const canManageEmployee = (
  currentUser: UserScope,
  targetEmployee: { level?: number; companyId?: string | null },
): boolean => {
  const myLevel = currentUser.hierarchyLevel || 0;
  const targetLevel = targetEmployee.level || 0;

  // 1. Hierarquia Primeiro (Regra de Ouro)
  if (isSuperAdminGod(currentUser)) return true;
  if (myLevel <= targetLevel) return false;

  // 2. Permissão do Módulo
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
  const role = roleToAssign.toLowerCase();
  if (["helper_system", "super_admin_god", "super_admin"].includes(role))
    return false;
  
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
 * Agora 100% dependente do permissionsMap do BackEnd.
 */
export const hasPermission = (
  user: UserScope | null | undefined,
  action: string,
  entity: string,
): boolean => {
  if (!user) return action === "read"; // Fallback seguro
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

    // Se a chave existir, o valor dela é a palavra final (Backend Decidindo)
    if (user.permissionsMap[permKey] !== undefined) {
      return user.permissionsMap[permKey];
    }

    // Fallback genérico para o módulo
    if (user.permissionsMap[moduleCode] !== undefined) {
      return user.permissionsMap[moduleCode];
    }
  }

  return action === "read"; // Fallback de segurança: apenas leitura
};
