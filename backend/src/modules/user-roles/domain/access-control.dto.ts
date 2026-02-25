export interface PermissionLevelDTO {
  id: string;
  name: string;
  rank: number;
  description?: string | null;
  isSystem: boolean;
  createdAt: Date;
}

export interface PermissionMatrixDTO {
  levelId: string;
  moduleId: string;
  isGranted: boolean;
  createdAt: Date;
}
