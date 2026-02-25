# Plano de Implementação: Correção de Tipagens, SOLID, DDD e Arquitetura Hexagonal

## 1. Diagnóstico do Projeto
Após uma análise inicial da compilação de tipagem (`npx tsc --noEmit`) nos módulos Frontend e Backend, identificamos o seguinte cenário:

- **Frontend**: Compilou com sucesso (0 erros de tipagem encontrados).
- **Backend**: Foram encontrados **280 erros em 98 arquivos**.
  - Grande parte desses erros está localizada em diretórios de scripts arquivados (`scripts/archive/*`) e arquivos de testes avulsos (`prisma/*`).
  - Existem erros reais e críticos na pasta `src/modules/`, afetando a camada de Aplicação e Infraestrutura, envolvendo incompatibilidade entre os DTOs do domínio e as tipagens geradas pelo Prisma (ORM).
  - Presença de múltiplos parâmetros com tipo `any` implícito (ex: `production-analytics.service.ts`).
  - Possíveis violações da Arquitetura Hexagonal, como o vazamento de tipos do Prisma (`Prisma.InputJsonValue`, `ProjectWhereInput`) para dentro das interfaces de Domínio ou Serviços de Aplicação.

## 2. Objetivos
- **Erro Zero**: Eliminar todos os erros do compilador TypeScript (`tsc`).
- **Arquitetura Limpa**: Adequar o sistema aos princípios SOLID, DDD (Domain-Driven Design) e Arquitetura Hexagonal (Ports and Adapters).
- **Isolamento**: Garantir que as camadas de Domínio (Domain) e Aplicação (Application) desconheçam a existência do Prisma ou de bibliotecas externas (Infraestrutura).

## 3. Fases da Implementação

### Fase 1: Limpeza de Ruído e Ajustes de Configuração (Quick Wins)
- **Ajuste no `tsconfig.json`**: Vamos atualizar o `tsconfig.json` do backend para excluir diretórios de scripts antigos (`scripts/archive`) que não fazem parte do código de produção ou domínio principal da aplicação, mas que geram ruído na compilação estrita.
- **Correções Simples de Sintaxe**: Resolução de pequenos "typos", importações quebradas ou desatualizadas (`@/lib/constants`, `supabase/server.ts`).

### Fase 2: Correção de Tipagem no Core (Aplicação e Domínio)
- **Tipagem Explícita**: Vamos adicionar tipos explícitos nas funções (principalmente callbacks como `.map` e `.filter` dentro de `production-analytics.service.ts`) que atualmente lançam erros de tipo `any` implícito.
- **Isolamento de DTOs**: Garantiremos que a camada de Serviço (`ProjectService`, `UserService`) utilize os DTOs declarados no Domínio, e não use diretamente os Inputs e Outputs injetados pelo Prisma (`ProjectWhereInput`, `UserWhereInput`).

### Fase 3: Adequação DDD e Hexagonal (Refatoração de Repositórios)
- **Adaptação de Repositórios (Infraestrutura)**: Repositórios concretos (ex: `PrismaProjectRepository`, `PrismaUserRepository`) atuarão como adaptadores válidos. Vamos implementar funções de _Mapper_ (ex: `PrismaMapper.toDomain(entity)`) para não passar objetos sujos do banco para a camada de serviço.
- **Interfaces Abstratas**: Assegurar que serviços como `AccessControlService` ou `ProjectService` dependam estritamente de abstrações (Interfaces de Domínio) e não da infraestrutura.

## 4. Próximos Passos Imediatos
1. Ler e editar `backend/tsconfig.json` para adicionar exclusões das pastas descartáveis (`archive`).
2. Rodar novamente a checagem de tipos para obtermos uma lista isolada dos problemas na camada `src/`.
3. Executar as substituições de código (`replace`) arquivo a arquivo nas camadas `Application` e `Infrastructure`, começando pelos erros em `src/modules/production/application/production-analytics.service.ts` e `src/modules/projects/application/project.service.ts`.
4. Repetir o ciclo de Plano -> Ação -> Validação até atingirmos 0 erros de compilação.
