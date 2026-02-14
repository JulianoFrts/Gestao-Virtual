// Importação das utilidades de renderização e busca da Testing Library
import { render, screen } from '@testing-library/react';
// Importação das funções globais e utilitários de mock do Vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Importação do componente que renderiza as rotas baseadas na configuração
import { RouteRenderer } from '../../../routes/RouteRenderer';
// Importação do MemoryRouter para simular a navegação interna do React Router
import { MemoryRouter } from 'react-router-dom';
// Importação da configuração de rotas original para validar se elas estão presentes
import { routes } from '../../../routes/config';

// Mock do componente ProtectedRoute para simplificar o teste de renderização da árvore
vi.mock('../../../routes/ProtectedRoute', () => ({
    // Apenas retorna os filhos para não interferir na verificação de renderização básica
    ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>
}));

// Mock do layout principal do App (Sidebar/Header)
import { Outlet } from "react-router-dom";
vi.mock('@/components/layout/AppLayout', () => ({
    // Renderiza um placeholder e o componente Outlet para permitir renderização de rotas filhas
    AppLayout: () => <div data-testid="app-layout"><Outlet /></div>
}));

// Mock dos componentes individuais importados via lazy em config.tsx
// Isso evita carregamento real de arquivos pesados durante os testes unitários
vi.mock('../../../pages/Dashboard', () => ({ default: () => <div data-testid="dashboard-page">Dashboard</div> }));
vi.mock('../../../pages/Auth', () => ({ default: () => <div data-testid="auth-page">Login</div> }));

// Suíte de testes para validar se o RouteRenderer interpreta corretamente o objeto de configuração
describe('002.RouteRenderer', () => {
    
    // Limpa o estado global dos mocks antes de cada execução de teste
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Teste 1: Verifica se a rota inicial (redirecionamento ou direta) funciona
    it('deve renderizar a rota de dashboard por padrão ou redirecionamento', async () => {
        // Renderiza o sistema de rotas injetado no MemoryRouter apontando para a raiz
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <RouteRenderer />
            </MemoryRouter>
        );
        // Aguarda a renderização do placeholder do Dashboard que é carregado via lazy
        const dashboard = await screen.findByTestId('dashboard-page', {}, { timeout: 3000 });
        expect(dashboard).toBeInTheDocument();
    });

    // Teste 2: Verifica se rotas protegidas são envolvidas pelo componente ProtectedRoute
    it('deve envolver rotas protegidas com o componente ProtectedRoute', async () => {
        // Renderiza apontando para uma rota que sabemos possuir um moduleId definido
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <RouteRenderer />
            </MemoryRouter>
        );
        // Busca o wrapper de proteção que mockamos anteriormente
        const protectedWrapper = await screen.findByTestId('protected-route');
        expect(protectedWrapper).toBeInTheDocument();
    });

    // Teste 3: Verifica se rotas com layout "app" renderizam dentro do AppLayout
    it('deve renderizar rotas de aplicação dentro do AppLayout', async () => {
        // Renderiza o Dashboard (que possui layout: "app" na configuração)
        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <RouteRenderer />
            </MemoryRouter>
        );
        // Valida se o container do layout principal está presente na árvore DOM
        const appLayout = await screen.findByTestId('app-layout');
        expect(appLayout).toBeInTheDocument();
    });

    // Teste 4: Verifica se rotas com layout "none" (ex: Auth) renderizam sem o AppLayout (Fullscreen/Clean)
    it('deve renderizar a página de auth sem o AppLayout', async () => {
        // Renderiza a página de login/autenticação
        render(
            <MemoryRouter initialEntries={['/auth']}>
                <RouteRenderer />
            </MemoryRouter>
        );
        // Valida que o conteúdo da página de login está presente
        const authPage = await screen.findByTestId('auth-page');
        expect(authPage).toBeInTheDocument();
        // Valida que o container do layout administrativo NÃO está presente (isolamento visual)
        expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
    });

    // Teste 5: Verifica a integridade da configuração (SOLID: Validação de Dados)
    it('deve possuir todas as rotas configuradas no arquivo de config', () => {
        // Valida se a lista de rotas importada para o componente não está vazia
        expect(routes.length).toBeGreaterThan(0);
        // Verifica se rotas críticas como /dashboard e /auth estão mapeadas
        expect(routes.find(r => r.path === '/dashboard')).toBeDefined();
        expect(routes.find(r => r.path === '/auth')).toBeDefined();
    });
});
