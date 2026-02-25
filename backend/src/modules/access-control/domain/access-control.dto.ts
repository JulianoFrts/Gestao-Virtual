export interface PermissionLevelDTO {
  id: string;
  name: string;
  rank: number;
  description?: string | null;
  isSystem: boolean;
  createdAt: Date;
}

export interface PermissionModuleDTO {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  createdAt: Date;
}

export interface PermissionMatrixDTO {
  levelId: string;
  moduleId: string;
  isGranted: boolean;
  createdAt: Date;
  module?: PermissionModuleDTO;
}

export interface PermissionModuleCreateDTO {
  code: string;
  name: string;
  category: string;
  description?: string | null;
}
