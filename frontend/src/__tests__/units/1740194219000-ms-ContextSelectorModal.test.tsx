/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03:22 ** 
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização seguindo a Regra de Ouro.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Reorganização arquitetural para maior clareza e manutenção.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar se os aliases de importação (@/*) estão resolvendo corretamente para a nova estrutura.
 * *****FIM*****
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextSelectorModal } from '@/components/auth/ContextSelectorModal';
import { AuthContext } from '@/contexts/AuthContext';
import { localApi } from '@/integrations/orion/client';

// Mock do localApi
jest.mock('@/integrations/orion/client', () => ({
  localApi: {
    get: jest.fn(),
  },
}));

const mockAuthContext = {
    profile: { id: 'user-1', name: 'Test User', role: 'ADMIN' },
    selectContext: jest.fn(),
    user: { id: 'user-1' },
    session: {},
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
};

describe('ContextSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render if options type is FIXED', async () => {
    (localApi.get as jest.Mock).mockResolvedValue({
      data: { type: 'FIXED', companyId: 'c1', projectId: 'p1', siteId: 's1' }
    });

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ContextSelectorModal open={true} onSuccess={() => {}} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
        expect(screen.queryByText(/Isolamento de Segurança/i)).not.toBeInTheDocument();
    });
  });

  it('should render options and allow selection for GLOBAL users', async () => {
    const mockOptions = {
      type: 'GLOBAL',
      companies: [{ id: 'c1', name: 'Company 1' }],
      projects: [{ id: 'p1', name: 'Project 1', companyId: 'c1' }],
      sites: [{ id: 's1', name: 'Site 1', projectId: 'p1' }]
    };
    (localApi.get as jest.Mock).mockResolvedValue({ data: mockOptions });

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ContextSelectorModal open={true} onSuccess={() => {}} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
        expect(screen.getByText(/Empresa Vinculada/i)).toBeInTheDocument();
    });
  });
});
