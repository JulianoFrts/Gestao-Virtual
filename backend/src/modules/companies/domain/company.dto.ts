export interface CompanyEntity {
  id: string;
  name: string;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyDTO {
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateCompanyDTO {
  name?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}
