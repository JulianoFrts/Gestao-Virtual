export type AssetType = "TOWER" | "SPAN" | "ANCHOR" | "OTHER";

export interface AssetEntity {
  id: string;
  companyId: string;
  projectId?: string | null;
  siteId?: string | null;
  elementType: string;
  externalId: string;
  name?: string | null;
  sequence: number;
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  geometry?: unknown;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetDTO {
  companyId: string;
  projectId?: string;
  siteId?: string;
  elementType: string;
  externalId: string;
  name?: string;
  sequence?: number;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  geometry?: unknown;
  metadata?: Record<string, any>;
}

export interface UpdateAssetDTO extends Partial<CreateAssetDTO> {}

export interface AssetFiltersDTO {
  projectId?: string;
  siteId?: string;
  companyId?: string;
  elementType?: string;
  search?: string;
}

// Work Stages DTOs unificados aqui também
export interface WorkStageDTO {
  id: string;
  name: string;
  description?: string | null;
  weight: number;
  displayOrder: number;
  parentId?: string | null;
  projectId?: string | null;
  siteId?: string | null;
}
