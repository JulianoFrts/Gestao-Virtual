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
  items: unknown[];
  total: number;
}

export interface TeamRepository {
  findAll(params: FindAllTeamsParams): Promise<TeamsListResult>;
  findById(id: string): Promise<any | null>;
  create(data: unknown): Promise<unknown>;
  update(id: string, data: unknown): Promise<unknown>;
  delete(id: string): Promise<unknown>;
  setSupervisorAtomic(teamId: string, supervisorId: string): Promise<unknown>;
  moveMemberAtomic(employeeId: string, toTeamId: string | null): Promise<unknown>;
  listMembers(params: unknown): Promise<unknown>;
  removeMember(teamId: string, userId: string): Promise<unknown>;
  removeAllMembers(teamId: string): Promise<unknown>;
  addMembersBatch(items: { teamId: string; userId: string }[]): Promise<any[]>;

  // Optional count method if needed separately, but findAll returns total
  count?(where: unknown): Promise<number>;
}
