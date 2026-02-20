# GESTÃO VIRTUAL
## Documento Oficial de Governança Técnica

Versão: 1.0
Status: Obrigatório
Aplicação: Backend + Frontend

## 1. Princípios Fundamentais

1. Backend é responsável por toda regra de negócio.
2. Frontend apenas exibe e delega.
3. src/index.css é a única fonte de verdade visual.
4. Código deve seguir DDD + SOLID + Clean Code.
5. Workspace deve permanecer limpo.
6. NÃO  FIQUE CONVERSANDO  SEM EU TER  PERGUNTADO, FAÇA SOMENTE O oque  for te ordenado.
7. seja objetivo e direto ao ponto e rapido e eficiente.
8. não perca tempo com coisas que não são importantes.
9. não faça nada sem minha permissão.   

## 2. Comunicação

- Idioma obrigatório: Português Brasileiro.
- Todo Plano de Implementação/Task/walkthrough/Checklist deve ser em Português Brasileiro.
- Explicações técnicas devem ser claras e objetivas.
- Não alternar idioma.

## 3. Padrão Visual

### 3.1 Fonte de Verdade

O arquivo src/index.css é a única fonte de estilos globais.

É proibido:
- Hardcode de cores
- Estilos ad-hoc
- Sombras fora de variáveis
- Criar novos temas sem aprovação arquitetural

### 3.2 Temas Permitidos

- Claro
- Escuro
- Sistema
- Cosmic Nebula

### 3.3 Estética Obrigatória

- Glassmorphism premium
- Utilizar @utility glass
- Utilizar @utility glass-card
- Usar --shadow-glow
- Garantir contraste e legibilidade

## 4. Arquitetura

### 4.1 Backend

Obrigatório:
- DDD
- SOLID
- Clean Code
- Separação clara de camadas
- Controllers enxutos
- Services responsáveis por regras
- Entidades ricas

Proibido:
- Regra de negócio no controller
- Lógica complexa no frontend

## 5. Implementação Técnica

### 5.1 Componentes

- Seguir padrão estrutural do projeto
- Utilizar alias @/
- Respeitar design system

### 5.2 Validações

- Validações críticas no backend
- Seguir padrão existente

### 5.3 Tipagem

- Nunca usar any
- DTOs explícitos
- Tipagem forte

### 5.4 Tratamento de Erros

- Seguir padrão centralizado
- Nunca silenciar erro
- Erros devem ser rastreáveis

## 6. Importações

Proibido:
../../../../component

Obrigatório:
@/components/Component

## 7. Dependências

- Sempre usar versões LTS mais recentes
- Nunca fazer downgrade
- npm audit deve estar com 0 vulnerabilidades
- Remover dependências órfãs

## 8. Organização

Ao finalizar qualquer tarefa:

- Remover dumps
- Remover logs temporários
- Remover scripts temporários
- Mover logs relevantes para archives/
- Não deixar arquivos soltos na raiz
- Mover arquivos de testes para suas pastas correspondentes dentro da pasta tests/

## 9. Checklist Final Obrigatório

Antes de finalizar:

[ ] Lint verificado
[ ] Sem erros de build
[ ] Sem imports relativos longos
[ ] Sem estilos fora do padrão
[ ] Backend contém toda regra de negócio
[ ] npm audit = 0 vulnerabilidades
[ ] Workspace limpo
[ ] Problemas atuais verificados (@current_problems)

## 10. Interpretação

Em caso de dúvida:

- Priorizar arquitetura sobre velocidade
- Priorizar padrão sobre criatividade isolada
- Priorizar backend sobre frontend
- Priorizar consistência sobre improviso
