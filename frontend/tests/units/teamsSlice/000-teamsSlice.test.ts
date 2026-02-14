import { describe, it, expect, vi, beforeEach } from 'vitest';
import teamsReducer, { setTeams } from '../../../src/store/slices/teamsSlice';
import { Team } from '../../../src/types/teams';

// Mock das dependências
vi.mock('@/integrations/database', () => ({
  db: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/services/storageService', () => ({
  storageService: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    addToSyncQueue: vi.fn(),
  },
}));

describe('teamsSlice', () => {
  const initialState = {
    items: [],
    isLoading: false,
    error: null,
    hasFetched: false,
  };

  const mockTeam: Team = {
    id: '1',
    name: 'Equipe Teste',
    supervisorId: 'sup1',
    leaderId: 'sup1',
    members: [],
    siteId: 'site1',
    companyId: 'comp1',
    projectId: null,
    isActive: true,
    displayOrder: 0,
    laborType: 'MOD',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar o estado inicial', () => {
    expect(teamsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('deve atualizar a lista de equipes via setTeams', () => {
    const state = teamsReducer(initialState, setTeams([mockTeam]));
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toEqual(mockTeam);
  });

  describe('AsyncThunks', () => {
    // Nota: Testes de Thunks exigem configuração de store ou despacho manual.
    // Como o objetivo é conformidade unitária do reducer, focamos nos estados do builder.
    
    it('deve lidar com fetchTeams.pending', () => {
      const state = teamsReducer(initialState, { type: 'teams/fetchTeams/pending' });
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('deve lidar com fetchTeams.fulfilled', () => {
      const state = teamsReducer(
        { ...initialState, isLoading: true },
        { type: 'teams/fetchTeams/fulfilled', payload: [mockTeam] }
      );
      expect(state.isLoading).toBe(false);
      expect(state.items).toEqual([mockTeam]);
      expect(state.hasFetched).toBe(true);
    });

    it('deve lidar com fetchTeams.rejected', () => {
      const state = teamsReducer(
        { ...initialState, isLoading: true },
        { type: 'teams/fetchTeams/rejected', payload: 'Erro de API' }
      );
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Erro de API');
    });
  });
});
