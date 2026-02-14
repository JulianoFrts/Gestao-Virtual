# Padrão de Testes Unitários - Team OrioN

Este documento define o padrão para a criação de testes unitários no projeto, seguindo os princípios de SOLID e DDD.

## Nomenclatura e Localização

Os testes devem seguir o padrão de sequenciamento numérico para facilitar a auditoria e execução em ordem lógica.

### Backend
- **Caminho Base**: `backend/src/app/api/v1/audit/quality-tests/units.tests/`
- **Regra de Organização**: Cada teste deve estar dentro de uma pasta com o nome do módulo.
- **Nome do Arquivo**: `[Sequencial].[Módulo].test.ts(x)`
- **Exemplo**: `.../units.tests/GAPO/001.GAPO.test.tsx`

### Frontend
- **Caminho**: Junto ao componente ou em `src/__tests__/units/[Nome_do_Componente]/`
- **Nome**: `[Sequencial].[Componente].test.tsx`
- **Exemplo**: `src/__tests__/units/LoadingScreen/001.LoadingScreen.test.tsx`

## Princípios

1. **SOLID**: Cada teste deve validar uma única responsabilidade.
2. **DDD**: Testes devem focar na lógica de negócio e comportamento do domínio.
3. **Isolamento**: Use mocks para dependências externas (APIs, Contextos, Hooks).
4. **Documentação Exaustiva**: Comentar **cada linha de código** do teste. O objetivo é que qualquer pessoa (ou IA) entenda perfeitamente o que está sendo simulado, executado e validado em cada passo.

## Exemplo de Teste Unitário (Vitest)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('deve renderizar corretamente', () => {
    render(<MyComponent />);
    expect(screen.getByText('Olá Mundo')).toBeInTheDocument();
  });
});
```
