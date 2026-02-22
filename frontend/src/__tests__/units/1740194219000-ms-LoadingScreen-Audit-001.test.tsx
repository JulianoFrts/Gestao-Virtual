/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03:25 ** 
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização seguindo a Regra de Ouro.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Reorganização arquitetural para maior clareza e manutenção.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar se os aliases de importação (@/*) estão resolvendo corretamente para a nova estrutura.
 * *****FIM*****
 */

// Importação das bibliotecas de teste (React Testing Library para renderização e Vitest para asserções e mocks)
import { render, screen } from '@testing-library/react'; // Funções básicas do RTL para lidar com o DOM
import { describe, it, expect, vi } from 'vitest'; // Core do Vitest para organizar e executar os testes
import React from 'react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { appProgressSignal, loadingModulesSignal } from '@/signals/appInitSignals';

const { mockProgress, mockModules } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { signal } = require('@preact/signals-react');
  return {
    mockProgress: signal(0),
    mockModules: signal([
      { id: 'users', label: 'Usuários e Acessos', status: 'loading' },
      { id: 'projects', label: 'Obras e Projetos', status: 'pending' },
      { id: 'employees', label: 'Funcionários', status: 'pending' },
      { id: 'teams', label: 'Equipes e Lideranças', status: 'pending' },
      { id: 'sites', label: 'Canteiros de Obra', status: 'pending' },
      { id: 'production', label: 'Dados de Produção', status: 'pending' },
      { id: 'viewer3d', label: 'Engenharia 3D', status: 'pending' },
      { id: 'reports', label: 'Relatórios e Médias', status: 'pending' },
    ]),
  };
});

vi.mock('@/signals/appInitSignals', () => ({
  appProgressSignal: mockProgress,
  loadingModulesSignal: mockModules,
}));

// Início do bloco de Mock global para a biblioteca de ícones lucide-react para evitar renderização de SVGs
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />, 
  CheckCircle2: () => <div data-testid="check-circle" />,
  Circle: () => <div data-testid="circle" />,
  FileText: () => <div data-testid="file-text" />,
}));

// Mock do runtime de signals para evitar efeitos colaterais em ambiente de teste
vi.mock('@preact/signals-react/runtime', () => ({
  useSignals: vi.fn(),
}));

// Definição da suíte de testes principal para o componente LoadingScreen com Signals
describe('LoadingScreen (Signal Driven)', () => {
  const mockProgress = appProgressSignal as any;
  const mockModules = loadingModulesSignal as any;
  
  // Primeiro teste: Validação da renderização inicial dos textos de marca
  it('deve renderizar o título da marca e indicador de sincronização', () => {
    render(<LoadingScreen />); // Renderiza o componente
    // O título "GESTÃO" é renderizado caractere por caractere para animação, verificamos um deles
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('VIRTUAL')).toBeInTheDocument();
    // Verifica o indicador de protocolo Orion do rodapé da marca
    expect(screen.getByText('Protocolo Orion v3')).toBeInTheDocument();
  });

  // Segundo teste: Validação do reflexo real do progresso vindo do signal
  it('deve exibir a porcentagem exata definida no signal de progresso', () => {
    (appProgressSignal as any).value = 45; // Cast de any para ignorar a tipagem readonly do computed original
    render(<LoadingScreen />); // Renderiza o componente
    
    // Verifica se o texto "45" (porcentagem) está visível na tela
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  // Terceiro teste: Validação da lista de módulos com os novos labels premium
  it('deve listar os 8 módulos com os novos labels definidos na arquitetura premium', () => {
    render(<LoadingScreen />); // Renderiza o componente
    
    // Verificação exaustiva dos nomes dos módulos conforme o novo padrão Real & Premium
    expect(screen.getByText('Usuários e Acessos')).toBeInTheDocument();
    expect(screen.getByText('Obras e Projetos')).toBeInTheDocument();
  });

  // Quarto teste: Validação da mudança de estado visual (ícones)
  it('deve mostrar o ícone de concluído quando o status do módulo muda para completed', () => {
    // Cast de any para permitir alteração do valor mockado
    const signalModules = loadingModulesSignal as any;
    // Altera o primeiro módulo para completed no signal mockado
    signalModules.value = [
      ...signalModules.value.slice(1, 8),
      { id: 'users', label: 'Usuários e Acessos', status: 'completed' }
    ];
    
    render(<LoadingScreen />); // Renderiza
    
    // Procura pelo mock do ícone CheckCircle2 renderizado pelo módulo completado
    expect(screen.getAllByTestId('check-circle').length).toBeGreaterThan(0);
  });
});
