import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/types';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchTeams, 
  addTeam, 
  updateTeam as updateTeamThunk, 
  deleteTeam as deleteTeamThunk,
  moveTeamMember as moveMemberThunk,
  setTeams
} from '@/store/slices/teamsSlice';
import { Team } from '@/types/teams';
import { currentUserSignal } from '@/signals/authSignals';

export function useTeams(companyId?: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  
  const { items: teams, isLoading, hasFetched, error } = useSelector((state: RootState) => state.teams);
  const hasInitialFetched = useRef(false);

  const loadTeams = useCallback(
    async (force = false) => {
      // Blindagem: Se não tiver usuário, não tenta buscar
      if (!currentUserSignal.value) {
          console.log("[useTeams] Skipped fetch: No user logged in.");
          return;
      }

      if ((hasFetched || hasInitialFetched.current) && !force) return;
      hasInitialFetched.current = true;
      dispatch(fetchTeams(companyId));
    },
    [dispatch, companyId, hasFetched]
  );

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro no Gerenciamento de Equipes',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const createTeam = async (data: {
    name: string;
    supervisorId?: string | null;
    members?: string[];
    siteId?: string;
    companyId?: string;
    projectId?: string;
    laborType?: "MOD" | "MOI";
  }) => {
    try {
      const resultAction = await dispatch(addTeam({
        ...data,
        members: data.members || []
      }));
      if (addTeam.fulfilled.match(resultAction)) {
        return { success: true, data: resultAction.payload.team };
      }
      return { success: false, error: resultAction.payload as string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateTeam = async (
    id: string,
    data: {
      name?: string;
      supervisorId?: string | null;
      members?: string[];
      siteId?: string | null;
      companyId?: string | null;
      projectId?: string | null;
      laborType?: "MOD" | "MOI" | null;
    }
  ) => {
    try {
      const resultAction = await dispatch(updateTeamThunk({ id, data }));
      if (updateTeamThunk.fulfilled.match(resultAction)) {
        return { success: true };
      }
      return { success: false, error: resultAction.payload as string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      const resultAction = await dispatch(deleteTeamThunk(id));
      if (deleteTeamThunk.fulfilled.match(resultAction)) {
        return { success: true };
      }
      return { success: false, error: resultAction.payload as string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const moveMember = async (
    employeeId: string,
    fromTeamId: string | null,
    toTeamId: string | null
  ) => {
    try {
      const resultAction = await dispatch(moveMemberThunk({ employeeId, fromTeamId, toTeamId }));
      if (moveMemberThunk.fulfilled.match(resultAction)) {
        return { success: true };
      }
      return { success: false, error: resultAction.payload as string };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    teams,
    isLoading,
    createTeam,
    updateTeam,
    deleteTeam,
    moveMember,
    refresh: () => loadTeams(true),
  };
}

export type { Team };
