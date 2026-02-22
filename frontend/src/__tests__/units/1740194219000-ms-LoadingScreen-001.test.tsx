/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03:25 ** 
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização seguindo a Regra de Ouro.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Reorganização arquitetural para maior clareza e manutenção.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar se os aliases de importação (@/*) estão resolvendo corretamente para a nova estrutura.
 * *****FIM*****
 */

// Importação das ferramentas de renderização e consulta do Testing Library
import { render, screen } from '@testing-library/react';
// Importação das funções globais de teste do Vitest
import { describe, it, expect } from 'vitest';
// Importação do componente LoadingScreen para teste
import { LoadingScreen } from '@/components/shared/LoadingScreen';

// Início do bloco descritivo para os testes da tela de carregamento
describe('LoadingScreen Component - Qualidade Total 001', () => {
  
  // Teste 01: Verificar se os elementos visuais básicos são renderizados
  it('001.1 - deve renderizar o ícone de carregamento e o texto padrão', () => {
    // Executa a renderização isolada do componente
    render(<LoadingScreen />);
    
    // Busca pelo elemento que contém a animação de "loader" (esperado que esteja presente)
    const loaderIcon = screen.getByRole('status', { hidden: true });
    
    // Asserção de que o ícone de carregamento está no documento
    expect(loaderIcon).toBeInTheDocument();
  });

  // Teste 02: Verificar se o componente ocupa a tela inteira (ajuste de layout)
  it('001.2 - deve possuir as classes de layout para centralização total', () => {
    // Renderiza o componente para inspeção de classes CSS
    const { container } = render(<LoadingScreen />);
    
    // Obtém o elemento raiz do componente (primeira div)
    const rootDiv = container.firstChild as HTMLElement;
    
    // Verifica se a classe 'flex' está presente para habilitar o flexbox
    expect(rootDiv.classList.contains('flex')).toBe(true);
    // Verifica se a classe 'items-center' está presente para centralização vertical
    expect(rootDiv.classList.contains('items-center')).toBe(true);
    // Verifica se a classe 'justify-center' está presente para centralização horizontal
    expect(rootDiv.classList.contains('justify-center')).toBe(true);
  });
});
