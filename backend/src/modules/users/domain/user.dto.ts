export interface UserEntity {
  // PILAR PESSOAL (Humano)
  id: string;
  name?: string | null;
  image?: string | null;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // PILAR DE SEGURANÇA (Auth) - Relacional
  authCredential?: {
    email: string;
    role: string;
    status: string;
    isSystemAdmin: boolean;
    permissions?: Record<string, unknown>;
    mfaEnabled?: boolean;
    lastLoginAt?: Date | null;
  };

  // PILAR DE OBRA (Operacional) - Relacional
  affiliation?: {
    companyId?: string | null;
    projectId?: string | null;
    siteId?: string | null;
    registrationNumber?: string | null;
    hierarchyLevel: number;
    laborType?: string | null;
    iapName?: string | null;
    functionId?: string | null;
    jobFunction?: {
      id: string;
      name: string;
      category: string;
      canLeadTeam: boolean;
    };
  };

  // Endereço
  address?: {
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    number?: string | null;
  };
}

export interface UserFiltersDTO {
  id?: string | null;
  search?: string | null;
  role?: string | null;
  status?: string | null;
  emailVerified?: boolean | null;
  createdAfter?: Date | null;
  createdBefore?: Date | null;
  projectId?: string | null;
  siteId?: string | null;
  companyId?: string | null;
  onlyCorporate?: boolean;
  excludeCorporate?: boolean;
  or?: string | null;
}

export interface UserPersonalInfo {
  name?: string;
  cpf?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  image?: string | null;
}

export interface UserSecurityInfo {
  email?: string;
  password?: string;
  role?: string;
  status?: string;
  isSystemAdmin?: boolean;
  permissions?: Record<string, unknown>;
}

export interface UserWorkInfo {
  companyId?: string;
  projectId?: string;
  siteId?: string;
  registrationNumber?: string;
  hierarchyLevel?: number;
  laborType?: string;
  functionId?: string;
  iapName?: string;
}

export interface CreateUserDTO extends UserPersonalInfo, UserWorkInfo {
  name: string; // Required for create
  email: string; // Required for create
  password?: string;
  role?: string;
  status?: string;
  isSystemAdmin?: boolean;
  permissions?: Record<string, unknown>;
}

export interface UpdateUserDTO extends UserPersonalInfo, UserSecurityInfo, UserWorkInfo {}
