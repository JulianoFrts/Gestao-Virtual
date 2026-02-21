// ==============================================================================
// TESTE UNITÁRIO: 001.ProtectedRoute
// OBJETIVO: Validar o controle de acesso e proteção de rotas (Guard)
// PADRÃO: Team OrioN - Qualidade Total (Comentários Exaustivos por Linha)
// ==============================================================================

// Importação das ferramentas de teste do Vitest e Testing Library
import { render, screen } from '@testing-library/react';
// Importação dos utilitários de asserção do Vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Importação do componente de roteamento para navegação programática necessária no Guard
import { MemoryRouter, Route, Routes } from 'react-router-dom';
// Importação do componente alvo do teste: ProtectedRoute
import { ProtectedRoute } from '@/routes/ProtectedRoute';
// Importação do hook de autenticação que será mockado
import { useAuth } from '@/contexts/AuthContext';
// Importação do sinal de permissão que será mockado
import * as authSignals from '@/signals/authSignals';

// Mock do hook useAuth para simular diferentes estados de usuário
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock do hook useSync para simular estados de conexão online/offline
vi.mock('@/contexts/SyncContext', () => ({
  useSync: vi.fn(() => ({ isOnline: true })),
}));

// Mock das ferramentas do Preact Signals para evitar erros de runtime durante os testes
vi.mock('@preact/signals-react/runtime', () => ({
  useSignals: vi.fn(),
}));

// Início do bloco de testes para o componente ProtectedRoute
describe('ProtectedRoute Component - Qualidade Total 001', () => {
  
  // Limpeza de todos os mocks antes de cada teste individual para garantir isolamento
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Teste 01: Verificação de redirecionamento para login quando o usuário não está autenticado
  it('001.1 - deve redirecionar para /auth quando o usuário não está autenticado', () => {
    // Definimos que o hook useAuth retorna usuário como nulo e carregamento finalizado
    (useAuth as any).mockReturnValue({ user: null, profile: null, isLoading: false });

    // Renderizamos o componente dentro de um MemoryRouter simulando a rota atual /dashboard
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute>Conteúdo Protegido</ProtectedRoute>} />
          <Route path="/auth" element={<div>Tela de Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verificamos se o texto da tela de login foi encontrado, confirmando o redirecionamento
    expect(screen.getByText('Tela de Login')).toBeInTheDocument();
  });

  // Teste 02: Verificação de bloqueio quando o usuário não possui permissão para o módulo específico
  it('001.2 - deve mostrar Acesso Restrito quando o usuário possui perfil mas não tem permissão para o moduleId', () => {
    // Definimos um usuário autenticado mas sem perfil completo inicialmente no mock
    (useAuth as any).mockReturnValue({ user: { id: '1' }, profile: { role: 'user' }, isLoading: false });
    
    // Mockamos a função 'can' para retornar falso (acesso negado)
    const canSpy = vi.spyOn(authSignals, 'can').mockReturnValue(false);

    // Renderizamos o componente informando um moduleId específico que requer permissão
    render(
      <MemoryRouter>
        <ProtectedRoute moduleId="restricted_module">
          Conteúdo Protegido
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Verificamos se a tela de "Acesso Restrito" foi exibida ao usuário
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    // Validamos se a função de verificação foi chamada com o módulo correto
    expect(canSpy).toHaveBeenCalledWith('restricted_module');
  });

  // Teste 03: Verificação de acesso permitido quando todas as condições são atendidas
  it('001.3 - deve renderizar os filhos quando o usuário está autenticado e possui permissão', () => {
    // Mock de usuário logado e com perfil carregado
    (useAuth as any).mockReturnValue({ user: { id: '1' }, profile: { role: 'admin' }, isLoading: false });
    
    // Mock de permissão concedida (true)
    vi.spyOn(authSignals, 'can').mockReturnValue(true);

    // Renderizamos o componente com um filho interno (children)
    render(
      <MemoryRouter>
        <ProtectedRoute moduleId="allowed_module">
          <div data-testid="protected-content">Conteúdo Liberado</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Verificamos se o conteúdo interno foi renderizado com sucesso na tela
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    // Confirmamos se o texto esperado está visível para o usuário
    expect(screen.getByText('Conteúdo Liberado')).toBeInTheDocument();
  });

  // Teste 04: Verificação de bloqueio quando o módulo exige conexão e o usuário está offline
  it('001.4 - deve mostrar Conexão Necessária quando o módulo exige conexão e o usuário está offline', () => {
    // Mock de usuário logado e com perfil
    (useAuth as any).mockReturnValue({ user: { id: '1' }, profile: { role: 'admin' }, isLoading: false });
    // Mock de estado offline
    const { useSync } = require('@/contexts/SyncContext');
    (useSync as any).mockReturnValue({ isOnline: false });

    // Renderizamos o componente com requireConnection ativado
    render(
      <MemoryRouter>
        <ProtectedRoute requireConnection={true}>
          Conteúdo Online Only
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Verificamos se a tela de "Conexão Necessária" foi exibida ao usuário
    expect(screen.getByText('Conexão Necessária')).toBeInTheDocument();
    // Validamos se o texto de orientação sobre a internet está presente
    expect(screen.getByText(/verifique sua internet/i)).toBeInTheDocument();
  });
});
