// Importação das ferramentas de teste do Vitest e Testing Library
import { render, screen } from '@testing-library/react';
// Importação das funções globais do Vitest para descrição de suítes e testes
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Importação dos contextos e signals para tipagem e mocks
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { can } from '@/signals/authSignals';
// Importação do componente que será testado (Unidade de Lógica de Acesso)
import { ProtectedRoute } from '../../../routes/ProtectedRoute';
// Importação do provedor de memória do React Router para simular navegação em testes
import { MemoryRouter } from 'react-router-dom';

// Criação de Mocks para as dependências externas para isolar o componente (SOLID: ISR)
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        // Mock do componente Navigate para capturar redirecionamentos sem efeitos colaterais
        Navigate: vi.fn(({ to }) => <div data-testid="navigate" data-to={to} />),
        // Espionamos os hooks sem quebrar a funcionalidade original do Router
        useNavigate: vi.fn(() => vi.fn()),
        useLocation: vi.fn(() => ({ pathname: '/test' }))
    };
});

// Mock do contexto de autenticação (Simula estado do usuário e carregamento)
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn()
}));

// Mock do contexto de sincronização (Simula estado de conectividade)
vi.mock('@/contexts/SyncContext', () => ({
    useSync: vi.fn()
}));

// Mock dos signals de autorização utilizando signals reais para evitar erros de renderização
const { mockIsProtected, mockCan } = vi.hoisted(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signal } = require('@preact/signals-react');
    return {
        mockIsProtected: signal(false),
        mockCan: vi.fn()
    };
});

vi.mock('@/signals/authSignals', () => ({
    isProtectedSignal: mockIsProtected,
    can: mockCan
}));

// Mock do runtime de signals para evitar erros de execução em ambiente Node/JSDOM
vi.mock('@preact/signals-react/runtime', () => ({
    useSignals: vi.fn()
}));

// Mock da biblioteca de ícones lucide-react para evitar erros com SVGs em ambiente JSDOM
vi.mock('lucide-react', () => ({
    ShieldAlert: () => <div data-testid="shield-alert" />
}));

// Mock do componente Button do shadcn/ui para evitar renderização complexa em testes unitários
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
        <button onClick={onClick} data-testid="ui-button">{children}</button>
    )
}));

// Suíte de testes para o componente ProtectedRoute
describe('001.ProtectedRoute', () => {
    // Utilitários de mock tipados para facilitar configuração em cada teste
    const mockUseAuth = vi.mocked(useAuth);
    const mockUseSync = vi.mocked(useSync);
    const mockCan = vi.mocked(can);

    // Limpa todos os mocks antes de cada teste para garantir isolamento e previsibilidade
    beforeEach(() => {
        vi.clearAllMocks();
        // Configura retornos padrão para evitar erros de desestruturação (SOLID: Robustez)
        mockUseAuth.mockReturnValue({ isLoading: false, user: null, profile: null, isMfaVerified: false } as any);
        mockUseSync.mockReturnValue({ isConnected: true, isInitialized: true } as any);
        mockCan.mockReturnValue(true);
    });

    // Teste 1: Verifica se renderiza null enquanto a autenticação está carregando
    it('deve renderizar null quando isLoading for true e não houver usuário', () => {
        // Simula estado de carregamento inicial do Firebase/Auth
        mockUseAuth.mockReturnValue({ isLoading: true, user: null, profile: null, isMfaVerified: false } as any);
        // Executa a renderização do componente
        const { container } = render(
            <MemoryRouter>
                <ProtectedRoute>Conteúdo Protegido</ProtectedRoute>
            </MemoryRouter>
        );
        // Valida que o conteúdo retornado está vazio
        expect(container.firstChild).toBeNull();
    });

    // Teste 2: Verifica redirecionamento para login se não houver usuário autenticado
    it('deve redirecionar para /auth quando não houver usuário', () => {
        // Simula usuário não logado
        mockUseAuth.mockReturnValue({ isLoading: false, user: null } as any);
        // Renderiza o componente
        render(
            <MemoryRouter>
                <ProtectedRoute>Conteúdo Protegido</ProtectedRoute>
            </MemoryRouter>
        );
        // Valida se o componente Navigate foi invocado com o destino correto
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/auth');
    });

    // Teste 3: Verifica acesso permitido para usuário logado sem restrições
    it('deve renderizar children quando usuário estiver logado e tiver acesso', () => {
        // Simula usuário logado com perfil básico e MFA verificado
        mockUseAuth.mockReturnValue({ 
            isLoading: false, 
            user: { uid: '123' },
            profile: { mfaEnabled: false, isSystemAdmin: false, role: 'user' },
            isMfaVerified: true
        } as any);
        // Simula conexão ativa e inicializada
        mockUseSync.mockReturnValue({ isConnected: true, isInitialized: true, syncStatus: 'idle' } as any);
        
        // Renderiza o componente com um filho identificável
        render(
            <MemoryRouter initialEntries={['/test']}>
                <ProtectedRoute>Conteúdo Protegido</ProtectedRoute>
            </MemoryRouter>
        );
        // Valida se o conteúdo protegido está visível na tela
        expect(screen.getByText('Conteúdo Protegido')).toBeInTheDocument();
    });

    // Teste 4: Verifica bloqueio de acesso administrativo quando offline (Regra de Negócio)
    it('deve mostrar aviso de offline quando requireConnection for true e estiver sem internet', () => {
        // Simula usuário logado mas offline
        mockUseAuth.mockReturnValue({ 
            isLoading: false, 
            user: { uid: '123' },
            profile: { mfaEnabled: false }
        } as any);
        mockUseSync.mockReturnValue({ isConnected: false } as any);
        // Renderiza exigindo conexão (típico de páginas de gestão)
        render(
            <MemoryRouter>
                <ProtectedRoute 
                    requireConnection={true} 
                    moduleId="users"
                >
                    Conteúdo Protegido
                </ProtectedRoute>
            </MemoryRouter>
        );
        // Valida que a mensagem de erro customizada para modo offline é exibida
        expect(screen.getByText('Acesso Restrito Offline')).toBeInTheDocument();
    });

    // Teste 5: Verifica acesso negado por falta de permissões específicas
    it('deve redirecionar para dashboard quando não tiver permissão do módulo', () => {
        // Simula usuário logado sem permissões de administrador e MFA verificado
        mockUseAuth.mockReturnValue({ 
            isLoading: false, 
            user: { uid: '123' },
            profile: { isSystemAdmin: false, mfaEnabled: false },
            isMfaVerified: true
        } as any);
        mockUseSync.mockReturnValue({ isConnected: true, isInitialized: true } as any);
        // Simula falha na checagem de permissão do backend
        mockCan.mockReturnValue(false);
        // Renderiza o componente associado a um módulo específico
        render(
            <MemoryRouter>
                <ProtectedRoute moduleId="financeiro">Conteúdo Protegido</ProtectedRoute>
            </MemoryRouter>
        );
        // Valida que o sistema redireciona o usuário para um local seguro (Dashboard)
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard');
    });
});
