export interface FindAllTeamsParams {
  page: number;
  limit: number;
  companyId?: string;
  siteId?: string;
  projectId?: string;
  isActive?: boolean;
  name?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface TeamsListResult {
  items: any[];
  total: number;
}

export interface TeamRepository {
  findAll(params: FindAllTeamsParams): Promise<TeamsListResult>;
  findById(id: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<any>;
  setSupervisorAtomic(teamId: string, supervisorId: string): Promise<any>;
  moveMemberAtomic(employeeId: string, toTeamId: string | null): Promise<any>;
  listMembers(params: any): Promise<any>;
  removeMember(teamId: string, userId: string): Promise<any>;
  removeAllMembers(teamId: string): Promise<any>;
  addMembersBatch(items: { teamId: string; userId: string }[]): Promise<any[]>;

  // Optional count method if needed separately, but findAll returns total
  count?(where: any): Promise<number>;
}
