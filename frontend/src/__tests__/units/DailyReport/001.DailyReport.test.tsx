// Importação das utilidades de teste da Testing Library React
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Importação das funções globais e utilitários do Vitest para suítes e espionagem
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Importação dos componentes fundamentais do React para estrutura de testes
import React from 'react';
// Importação do componente DailyReport que será o alvo do teste unitário
import DailyReport from '@/pages/DailyReport';
// Importação do provedor de Mensagens para evitar erros de renderização (shadcn/ui dependência)
import { ToastProvider } from '@/components/ui/toast';
// Importação dos signals e hooks que serão mockados para isolar a unidade (SOLID: ISR)
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/signals/authSignals';
import { useTeams } from '@/hooks/useTeams';
import { useSites } from '@/hooks/useSites';
import { useEmployees } from '@/hooks/useEmployees';
import { useDailyReports } from '@/hooks/useDailyReports';
import { useSpanTechnicalData } from '@/hooks/useSpanTechnicalData';
import { useToast } from '@/hooks/use-toast';
import { orionApi } from '@/integrations/orion/client';
import { dailyReportDraftSignal } from '@/signals/dailyReportSignals';

// Mock do contexto de autenticação para simular diferentes perfis de usuário
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn()
}));

// Mock dos sinais de autorização para controlar visibilidade de elementos administrativos
vi.mock('@/signals/authSignals', () => ({
    isProtectedSignal: { value: false },
    can: vi.fn()
}));

// Mock do hook de equipes para simular lista de equipes do projeto
vi.mock('@/hooks/useTeams', () => ({
    useTeams: vi.fn()
}));

// Mock do hook de canteiros para simular a base de dados de sites
vi.mock('@/hooks/useSites', () => ({
    useSites: vi.fn()
}));

// Mock do hook de funcionários para simular lista de colaboradores para seleção
vi.mock('@/hooks/useEmployees', () => ({
    useEmployees: vi.fn()
}));

// Mock do hook principal de relatórios diários (Lógica de Persistência)
vi.mock('@/hooks/useDailyReports', () => ({
    useDailyReports: vi.fn()
}));

// Mock do hook de dados técnicos de vãos (Usado para estimativa de cabos)
vi.mock('@/hooks/useSpanTechnicalData', () => ({
    useSpanTechnicalData: vi.fn()
}));

// Mock da biblioteca de ícones lucide-react para evitar erros com SVGs em ambiente JSDOM
vi.mock('lucide-react', () => ({
    FileText: () => <div data-testid="icon-filetext" />,
    Check: () => <div data-testid="icon-check" />,
    ChevronRight: () => <div data-testid="icon-chevronright" />,
    ChevronLeft: () => <div data-testid="icon-chevronleft" />,
    Calendar: () => <div data-testid="icon-calendar" />,
    Clock: () => <div data-testid="icon-clock" />,
    Loader2: () => <div data-testid="icon-loader2" />,
    Send: () => <div data-testid="icon-send" />,
    ChevronsUpDown: () => <div data-testid="icon-chevronsupdown" />,
    Search: () => <div data-testid="icon-search" />
}));

// Mock dos componentes de UI do Shadcn para simplificar a renderização em testes unitários
vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange, "aria-label": ariaLabel }: any) => (
        <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="ui-select" aria-label={ariaLabel}>
            {children}
        </select>
    ),
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectGroup: ({ children }: any) => <div>{children}</div>,
    SelectLabel: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/popover', () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <div>{children}</div>,
    PopoverContent: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/command', () => ({
    Command: ({ children }: any) => <div>{children}</div>,
    CommandInput: ({ placeholder }: any) => <input placeholder={placeholder} />,
    CommandEmpty: ({ children }: any) => <div>{children}</div>,
    CommandGroup: ({ children }: any) => <div>{children}</div>,
    CommandItem: ({ children, onSelect }: any) => <div onClick={onSelect}>{children}</div>,
    CommandList: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, type }: any) => (
        <button onClick={onClick} disabled={disabled} type={type}>{children}</button>
    )
}));

vi.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, placeholder }: any) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
    )
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardFooter: ({ children }: any) => <div>{children}</div>
}));

vi.mock('@/components/ui/label', () => ({
    Label: ({ children, className }: any) => <label className={className}>{children}</label>
}));
// Mock do sistema de notificações (Shadcn UI Toast)
vi.mock('@/hooks/use-toast', () => ({
    useToast: vi.fn()
}));

// Mock do cliente de API Orion para simular requisições ao backend de torres
vi.mock('@/integrations/orion/client', () => ({
    orionApi: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: vi.fn()
        }))
    }
}));

// Mock dos signals de persistência do formulário para evitar efeitos colaterais entre testes
vi.mock('@/signals/dailyReportSignals', () => ({
    dailyReportDraftSignal: {
        value: {
            employeeId: '',
            subPointType: 'TORRE',
            subPoint: '',
            subPointEnd: '',
            isMultiSelection: false,
            teamIds: [],
            activities: '',
            observations: '',
            step: 1
        }
    },
    updateReportDraft: vi.fn(),
    initReportDraft: vi.fn(),
    resetReportDraft: vi.fn()
}));

// Mock do runtime de signals para evitar erros de renderização reativa em ambiente Node
vi.mock('@preact/signals-react/runtime', () => ({
    useSignals: vi.fn()
}));

// Suíte de Testes: 001.DailyReport
// Foco: Validar a orquestração do formulário V3 e integração de dados reais
describe('001.DailyReport', () => {
    // Declaração de mocks tipados para manipulação precisa nos casos de teste
    const mockUseAuth = vi.mocked(useAuth);
    const mockUseTeams = vi.mocked(useTeams);
    const mockUseSites = vi.mocked(useSites);
    const mockUseEmployees = vi.mocked(useEmployees);
    const mockUseDailyReports = vi.mocked(useDailyReports);
    const mockUseSpan = vi.mocked(useSpanTechnicalData);
    const mockUseToast = vi.mocked(useToast);

    // Configuração inicial antes de cada execução de teste (Ambiente Limpo)
    beforeEach(() => {
        // Reseta todos os estados de espionagem e chamadas
        vi.clearAllMocks();

        // Mock de permissões (Simula Administrador)
        const mockCan = vi.mocked(can);
        mockCan.mockReturnValue(true);

        // Mock de autenticação (Simula Administrador Logado)
        mockUseAuth.mockReturnValue({ profile: { companyId: 'comp-1', employeeId: 'emp-admin', fullName: 'Admin User' } } as any);
        // Mock de equipes (Simula Equipes do Canteiro)
        mockUseTeams.mockReturnValue({ teams: [{ id: 'team-1', name: 'Equipe Civil', siteId: 'site-1', members: [] }] } as any);
        // Mock de sites (Simula Canteiros Ativos)
        mockUseSites.mockReturnValue({ sites: [{ id: 'site-1', name: 'LT 500KV - Trecho 1', projectId: 'proj-1' }] } as any);
        // Mock de funcionários (Simula Cadastro de Colaboradores)
        mockUseEmployees.mockReturnValue({ employees: [{ id: 'emp-1', fullName: 'João Silva' }] } as any);
        // Mock de relatórios (Simula Histórico e Métodos de Cadastro)
        mockUseDailyReports.mockReturnValue({
            createReport: vi.fn(),
            getTodayReports: vi.fn(() => [])
        } as any);
        // Mock de vãos (Retorno vazio padrão)
        mockUseSpan.mockReturnValue({ spans: [] } as any);
        // Mock de toast (Monitoramento de erros e sucessos)
        mockUseToast.mockReturnValue({ toast: vi.fn() } as any);
    });

    // Teste 1: Validação de Renderização Inicial e Carregamento de Dependências
    it('deve renderizar o formulário inicial corretamente', () => {
        // Executa a renderização do componente envolto no provedor de toast
        render(<ToastProvider><DailyReport /></ToastProvider>);

        // Valida a presença do título principal (Novo Relatório)
        expect(screen.getByText(/Novo Relatório/i)).toBeInTheDocument();
        // Valida se o passo 1 (Identificação) está ativo
        expect(screen.getByText(/Passo 1: Identificação e Equipe/i)).toBeInTheDocument();
        // Valida se o rótulo de funcionário está visível
        expect(screen.getByText(/Funcionário \*/i)).toBeInTheDocument();
    });

    // Teste 2: Validação da Seleção de Colaborador (Fluxo Crítico)
    it('deve permitir selecionar um funcionário na lista', async () => {
        // Renderiza o componente
        render(<ToastProvider><DailyReport /></ToastProvider>);

        // Localiza o gatilho do componente Select de funcionários (através da label ou índice)
        const selects = screen.getAllByTestId('ui-select');
        const employeeSelect = selects[0]; // O primeiro select no formulário

        // Simula a mudança de valor (Seleção do João Silva)
        fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });

        // Valida se o valor foi alterado
        expect(employeeSelect).toHaveValue('emp-1');
    });

    // Teste 3: Validação da Alternância para Seleção Múltipla de Torres
    it('deve mostrar campos de intervalo quando seleção múltipla estiver ativa', () => {
        // Ajusta o sinal do rascunho para simular modo de seleção múltipla já ativo
        dailyReportDraftSignal.value.isMultiSelection = true;

        // Renderiza o componente
        render(<ToastProvider><DailyReport /></ToastProvider>);

        // Valida a alteração dos labels para indicar o intervalo de torres
        expect(screen.getByText(/DA TORRE:/i)).toBeInTheDocument();
        expect(screen.getByText(/Até a Torre:/i)).toBeInTheDocument();
    });

    // Teste 4: Validação do Comportamento de Passo (Navegação Interna)
    it('deve bloquear a continuação se o formulário estiver incompleto', () => {
        // Localiza a função de toast mockada
        const { toast } = mockUseToast();
        // Renderiza o componente
        render(<ToastProvider><DailyReport /></ToastProvider>);

        // Localiza o botão de continuação
        const nextButton = screen.getByText('Continuar para Atividades');
        // Simula o clique sem preencher dados obrigatórios
        fireEvent.click(nextButton);

        // Valida se a mensagem de erro (Toast) foi acionada (Regra de Negócio: Validação de Passo)
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Campos obrigatórios'
        }));
    });
});
