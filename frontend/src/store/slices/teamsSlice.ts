import { createSlice, createAsyncThunk, PayloadAction, current } from '@reduxjs/toolkit';
import { db, orionApi } from '@/integrations/database';
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

      const response = await orionApi.get<Team[]>('/teams', companyId ? { companyId } : undefined);
      if (response.error) throw new Error(response.error.message);

      const teamsData = response.data || [];
      const mapped: Team[] = teamsData.map((t: any) => ({
        id: t.id,
        name: t.name,
        supervisorId: t.supervisorId || t.supervisor_id,
        supervisorName: t.supervisor?.name || undefined,
        leaderId: t.supervisorId || t.supervisor_id,
        members: (t.teamMembers || t.team_members || []).map((m: any) => m.userId || m.user_id),
        siteId: t.siteId || t.site_id,
        companyId: t.companyId || t.company_id,
        projectId: t.projectId || t.project_id || null,
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
  async (data: { name: string; supervisorId?: string; siteId?: string; companyId?: string; projectId?: string; members: string[]; laborType?: "MOD" | "MOI" }, { rejectWithValue }) => {
    const localId = generateId();
    const newTeam: Team = {
      id: localId,
      name: data.name,
      supervisorId: data.supervisorId || null,
      leaderId: data.supervisorId || null,
      members: data.members || [],
      siteId: data.siteId || null,
      companyId: data.companyId || null,
      projectId: data.projectId || null,
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

      const response = await orionApi.post<any>('/teams', {
        name: data.name,
        supervisorId: data.supervisorId || null,
        siteId: data.siteId || null,
        companyId: data.companyId || null,
        projectId: data.projectId || null,
        laborType: data.laborType || 'MOD',
      });

      if (response.error) throw new Error(response.error.message);
      const created = response.data;

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

      const updatePayload: any = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.isActive !== undefined) updatePayload.is_active = data.isActive;
      if (data.supervisorId !== undefined) updatePayload.supervisor_id = data.supervisorId;
      if (data.siteId !== undefined) updatePayload.site_id = data.siteId || null;
      if (data.companyId !== undefined) updatePayload.company_id = data.companyId || null;
      if (data.projectId !== undefined) updatePayload.project_id = data.projectId || null;
      if (data.laborType !== undefined) updatePayload.labor_type = data.laborType;
      if (data.members !== undefined) {
         // This typically requires a separate transaction or table update if it's many-to-many,
         // but if the backend handles it via 'members' column or similar, we keep it.
         // Given the context of previous fixes, we keep the existing behavior for members.
      }

      const response = await orionApi.put<any>(`/teams/${id}`, updatePayload);
      if (response.error) throw new Error(response.error.message);

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

      const response = await orionApi.delete(`/teams/${id}`);
      if (response.error) throw new Error(response.error.message);

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

      const response = await orionApi.post('/teams/members/move', {
        employeeId,
        toTeamId
      });

      if (response.error) throw new Error(response.error.message);

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
        
        // Se estamos definindo um novo líder, remover ele de outras equipes visualmente
        const newLeaderId = action.payload.data.supervisorId;
        if (newLeaderId) {
          state.items.forEach(t => {
            // Remove de qualquer equipe onde seja líder (exceto a atual)
            if (t.id !== action.payload.id && t.supervisorId === newLeaderId) {
              t.supervisorId = null;
              t.leaderId = null;
            }
            // NOVO: Remove de QUALQUER equipe onde seja membro (inclusive a atual)
            // Já que Líder não é mais membro do array.
            if (t.members.includes(newLeaderId as string)) {
              t.members = t.members.filter(m => m !== newLeaderId);
            }
          });
        }

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
        console.log('[Redux] moveTeamMember.fulfilled', { employeeId, fromTeamId, toTeamId });

        // Remover de todas as equipes (Membro e Liderança)
        state.items.forEach((t) => {
          if (t.id === fromTeamId || t.members.includes(employeeId)) {
            t.members = t.members.filter((m) => m !== employeeId);
          }
          // Se o funcionário era o líder de qualquer equipe, limpa
          // APENAS se estiver indo para o pool (toTeamId null) OU para uma equipe DIFERENTE
          if (t.supervisorId === employeeId && t.id !== toTeamId) {
            t.supervisorId = null;
            t.leaderId = null;
          }
        });

        // Adicionar na equipe destino
        if (toTeamId) {
          const targetTeam = state.items.find(t => t.id === toTeamId);
          if (targetTeam) {
            targetTeam.members.push(employeeId);
            console.log(`[Redux] Team ${targetTeam.name} members: ${targetTeam.members.length}`, [...targetTeam.members]);
          }
        }

        // Atualiza o cache local
        storageService.setItem('teams', current(state.items));
      });
  },
});

export const { setTeams } = teamsSlice.actions;
export default teamsSlice.reducer;
