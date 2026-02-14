import { createSlice, createAsyncThunk, PayloadAction, current } from '@reduxjs/toolkit';
import { db } from '@/integrations/database';
import { storageService } from '@/services/storageService';
import { isTeamsLoadingSignal, hasTeamsFetchedSignal } from '@/signals/syncSignals';
import { Team } from '@/types/teams';
import { generateId } from '@/lib/utils';

interface TeamsState {
  items: Team[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
}

const initialState: TeamsState = {
  items: [],
  isLoading: false,
  error: null,
  hasFetched: false,
};

// AsyncThunks
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (companyId: string | undefined, { rejectWithValue }) => {
    try {
      if (!navigator.onLine) {
        const cached = await storageService.getItem<Team[]>('teams');
        return cached || [];
      }

      let query = db.from('teams').select(`
        *,
        supervisor:users!teams_supervisor_id_fkey(name)
      `) as any;

      if (companyId) query = query.eq('company_id', companyId);

      const { data: teamsData, error: teamsError } = await query.order('name');
      if (teamsError) throw teamsError;

      const { data: membersData, error: membersError } = await db
        .from('team_members')
        .select('teamId, userId');
      if (membersError) throw membersError;

      const membersByTeam = (membersData || []).reduce((acc, m) => {
        const tId = m.teamId || m.team_id;
        const uId = m.userId || m.user_id;
        if (!tId) return acc;
        if (!acc[tId]) acc[tId] = [];
        if (uId) acc[tId].push(uId);
        return acc;
      }, {} as Record<string, string[]>);

      const mapped: Team[] = (teamsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        supervisorId: t.supervisorId || t.supervisor_id,
        supervisorName: t.supervisor?.name || undefined,
        leaderId: t.supervisorId || t.supervisor_id,
        members: membersByTeam[t.id] || [],
        siteId: t.siteId || t.site_id,
        companyId: t.companyId || t.company_id,
        projectId: t.project_id || t.projectId || null,
        isActive: t.isActive ?? t.is_active ?? true,
        displayOrder: t.displayOrder ?? t.display_order ?? 0,
        laborType: t.laborType || t.labor_type || 'MOD',
        createdAt: t.createdAt || t.created_at || new Date().toISOString(),
      }));

      await storageService.setItem('teams', mapped);
      return mapped;
    } catch (error: any) {
      // Fallback para cache mesmo em caso de erro de rede (Ex: servidor caiu mas wifi está ON)
      const cached = await storageService.getItem<Team[]>('teams');
      if (cached && cached.length > 0) {
        console.log('[TeamsSlice] Network error, falling back to local cache.');
        return cached;
      }
      return rejectWithValue(error.message || 'Erro ao carregar equipes');
    }
  }
);

export const addTeam = createAsyncThunk(
  'teams/addTeam',
  async (data: { name: string; supervisorId?: string; siteId?: string; companyId?: string; members: string[]; laborType?: "MOD" | "MOI" }, { rejectWithValue }) => {
    const localId = generateId();
    const newTeam: Team = {
      id: localId,
      name: data.name,
      supervisorId: data.supervisorId || null,
      leaderId: data.supervisorId || null,
      members: data.members || [],
      siteId: data.siteId || null,
      companyId: data.companyId || null,
      projectId: null,
      isActive: true,
      displayOrder: 0,
      laborType: data.laborType || 'MOD',
      createdAt: new Date().toISOString(),
    };

    try {
      if (!navigator.onLine) {
        await storageService.addToSyncQueue({
          operation: 'insert',
          table: 'teams',
          data: { ...data, localId },
        });
        return { team: newTeam, isOffline: true };
      }

      const { data: created, error } = await (db
        .from('teams')
        .insert({
          name: data.name,
          supervisor_id: data.supervisorId || null,
          site_id: data.siteId || null,
          company_id: data.companyId || null,
          display_order: 0,
          labor_type: data.laborType || 'MOD',
        })
        .select(`*, supervisor:users!teams_supervisor_id_fkey(name)`)
        .single() as any);

      if (error) throw error;

      if (data.members && data.members.length > 0) {
        await db.from('team_members').insert(
          data.members.map((empId) => ({
            team_id: created.id,
            user_id: empId,
          }))
        );
      }

      const updatedTeam: Team = {
        ...newTeam,
        id: created.id,
        supervisorName: created.supervisor?.name,
        leaderId: created.supervisor_id,
      };

      return { team: updatedTeam, isOffline: false };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erro ao criar equipe');
    }
  }
);

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ id, data }: { id: string; data: Partial<Team> & { members?: string[] } }, { rejectWithValue }) => {
    try {
      if (!navigator.onLine) {
        await storageService.addToSyncQueue({
          operation: 'update',
          table: 'teams',
          id,
          data,
        });
        return { id, data, isOffline: true };
      }

      const { error } = await db
        .from('teams')
        .update({
          name: data.name,
          supervisor_id: data.supervisorId || null,
          site_id: data.siteId || null,
          company_id: data.companyId || null,
          labor_type: data.laborType || undefined,
        })
        .eq('id', id);

      if (error) throw error;

      if (data.members !== undefined) {
        await db.from('team_members').delete().eq('team_id', id);
        if (data.members.length > 0) {
          await db.from('team_members').insert(
            data.members.map((empId) => ({
              team_id: id,
              user_id: empId,
            }))
          );
        }
      }

      return { id, data, isOffline: false };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erro ao atualizar equipe');
    }
  }
);

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (id: string, { rejectWithValue }) => {
    try {
      if (!navigator.onLine) {
        await storageService.addToSyncQueue({
          operation: 'delete',
          table: 'teams',
          id,
        });
        return id;
      }

      const { error } = await db.from('teams').delete().eq('id', id);
      if (error) throw error;

      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erro ao remover equipe');
    }
  }
);

export const moveTeamMember = createAsyncThunk(
  'teams/moveTeamMember',
  async ({ employeeId, fromTeamId, toTeamId }: { employeeId: string; fromTeamId: string | null; toTeamId: string | null }, { rejectWithValue }) => {
    try {
      if (!navigator.onLine) {
        // Lógica Offline: Adiciona à fila de sincronização e retorna para atualizar o Redux localmente
        await storageService.addToSyncQueue({
          operation: 'rpc',
          function: 'move_team_member',
          data: {
            p_employee_id: employeeId,
            p_from_team_id: fromTeamId,
            p_to_team_id: toTeamId,
          },
        });
        return { employeeId, fromTeamId, toTeamId, isOffline: true };
      }

      const { error } = await (db.rpc as any)('move_team_member', {
        p_employee_id: employeeId,
        p_from_team_id: fromTeamId,
        p_to_team_id: toTeamId,
      });

      if (error) throw error;

      return { employeeId, fromTeamId, toTeamId, isOffline: false };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erro ao mover membro');
    }
  }
);

export const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setTeams: (state, action: PayloadAction<Team[]>) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        isTeamsLoadingSignal.value = true;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.hasFetched = true;
        isTeamsLoadingSignal.value = false;
        hasTeamsFetchedSignal.value = true;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        isTeamsLoadingSignal.value = false;
        hasTeamsFetchedSignal.value = true; // Mesmo com erro, marcamos como "tentado" para não travar a UI
      })
      .addCase(addTeam.fulfilled, (state, action) => {
        state.items.push(action.payload.team);
        storageService.setItem('teams', current(state.items));
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        const index = state.items.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload.data };
        }
        storageService.setItem('teams', current(state.items));
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
        storageService.setItem('teams', current(state.items));
      })
      .addCase(moveTeamMember.fulfilled, (state, action) => {
        const { employeeId, fromTeamId, toTeamId } = action.payload;
        state.items = state.items.map((t) => {
          let newMembers = [...t.members];
          if (t.id === fromTeamId || newMembers.includes(employeeId)) {
            newMembers = newMembers.filter((m) => m !== employeeId);
          }
          if (t.id === toTeamId) {
            newMembers = [...newMembers, employeeId];
          }
          return { ...t, members: newMembers };
        });
        // IMPORTANTE: Atualiza o cache local para sobreviver ao REFRESH (F5)
        storageService.setItem('teams', current(state.items));
      });
  },
});

export const { setTeams } = teamsSlice.actions;
export default teamsSlice.reducer;
