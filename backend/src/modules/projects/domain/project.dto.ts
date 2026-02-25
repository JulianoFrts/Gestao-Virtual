export interface ProjectEntity {
  id: string;
  companyId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  address?: string | null;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  plannedHours: number;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFiltersDTO {
  id?: string;
  companyId?: string;
  status?: string;
  code?: string;
  search?: string;
}

export interface CreateProjectDTO {
  companyId: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  plannedHours?: number;
  estimatedCost?: number;
}

export interface UpdateProjectDTO {
  name?: string;
  code?: string;
  description?: string;
  address?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  plannedHours?: number;
  estimatedCost?: number;
}
