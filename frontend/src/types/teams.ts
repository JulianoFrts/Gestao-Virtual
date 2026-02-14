export interface Team {
  id: string;
  name: string;
  supervisorId: string | null;
  supervisorName?: string;
  leaderId: string | null;
  members: string[];
  siteId: string | null;
  companyId: string | null;
  projectId: string | null;
  isActive: boolean;
  displayOrder: number;
  laborType: 'MOD' | 'MOI' | null;
  createdAt: string | Date;
}
