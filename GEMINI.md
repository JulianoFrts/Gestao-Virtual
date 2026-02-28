# Diretrizes Técnicas e Padrões de Engenharia - GESTÃO VIRTUAL

Este documento define os padrões fundamentais de arquitetura, segurança e qualidade de código que DEVEM ser seguidos em todas as manutenções e novas implementações do projeto.

## 1. Mandatos de Segurança e Integridade

- **Proteção de Credenciais:** Nunca logar, imprimir ou commitar segredos, chaves de API ou senhas lógicas.
- **Sanitização de Input:** Obrigatório o uso de schemas **Zod** para validação de todas as entradas de API (POST/PUT/PATCH).
- **Hardcoded Patterns:** É terminantemente proibido o uso de URLs, IPs ou segredos hardcoded. Utilize sempre o `process.env`.
- **Segurança de Dependências:** Evite o uso de pacotes standalone vulneráveis (ex: Electron em ambiente de desenvolvimento). Prefira extensões de navegador ou ferramentas modernas como Tauri/Playwright.

## 2. Padrões de Arquitetura (SOLID & DDD)

O projeto adere estritamente à tripartição de responsabilidades:

- **Domínio (Domain):** Contém a lógica de negócio pura, interfaces de repositório e entidades. Não deve depender de frameworks ou IO.
- **Aplicação (Application):** Orquestra fluxos de negócio através de Serviços. Depende apenas das interfaces do domínio (DIP).
- **Infraestrutura (Infrastructure):** Implementações concretas (Prisma Repositories, Providers de Terceiros).

### Regras Específicas:

- **ISP (Interface Segregation):** Evite interfaces massivas. Quebre modelos como `Tower` ou `ProductionProgress` em sub-interfaces funcionais (Identity, State, Governance).
- **DIP (Dependency Inversion):** Serviços não devem instanciar suas dependências. Devem recebê-las via construtor (Injeção de Dependência).
- **SRP (Single Responsibility):** Arquivos que ultrapassam 400 linhas devem ser candidatos imediatos à modularização.

## 3. Qualidade de Código e Tipagem

- **Erradicação do 'any':** O uso do tipo `any` é proibido. Utilize tipos explícitos, `unknown` com cast seguro ou Generics.
- **Casts Inseguros:** Evite o padrão `as unknown as`. Refatore a origem da tipagem para garantir compatibilidade natural.
- **Tipagem de Retorno:** Todas as funções públicas e rotas de API devem ter tipos de retorno explícitos (ex: `Promise<Response>`, `void`, `UserEntity`).
- **Magic Numbers:** Números literais (exceto 0, 1 e 2) devem ser substituídos por constantes nomeadas em `src/lib/constants`.

## 4. Testabilidade e Determinismo

- **TimeProvider:** Nunca utilize `Date.now()` ou `new Date()` diretamente em camadas de aplicação ou domínio. Injete o `TimeProvider` para permitir mocks determinísticos em testes.
- **RandomProvider:** Utilize a abstração `RandomProvider` para geração de tokens, senhas temporárias ou nomes aleatórios.

## 5. Auditoria Arquitetural (Live Scan)

O motor de auditoria (`npm run audit:scan`) é a autoridade final sobre a saúde do código.

- **Zero Alertas:** O objetivo contínuo é manter 0 violações HIGH, MEDIUM e LOW.
- **Falsos Positivos:** Se um padrão for mal interpretado pelo auditor, quebre a string de detecção ou adicione o comentário `/* bypass-audit */` apenas em locais de infraestrutura comprovadamente seguros.

## 6. Convenções de Banco de Dados (Prisma)

- **Modelagem de Usuário:** O modelo `User` é central. Detalhes de vínculo empregatício residem em `Affiliation` e endereços em `UserAddress` (1:1).
- **Performance:** Evite loops $O(n^2)$ em scripts de seed. Utilize `Maps` para indexação em memória e `createMany`/`upsert` em lote.
- **Persistência de Ativos:** Ao salvar ativos de infraestrutura (map_elements), é OBRIGATÓRIO o envio do `company_id` e `project_id` para garantir a integridade referencial.

## 7. Padrões de Frontend e UI

- **Componentes Baseados em Permissões:** Utilize o hook `usePermissions` para encapsular a lógica de exibição.
- **Carregamento Assíncrono (Batching):** Para listagens > 100 itens, utilize carregamento por lotes.
- **Arquitetura de Componentes (Nova Regra de Ouro):** 
    - **Prioridade Absoluta:** Sempre prefira criar NOVOS componentes ou hooks (`useFeature.ts`) em vez de editar componentes existentes.
    - **Vantagens:** Facilita a criação de testes isolados, evita efeitos colaterais em cascata e mantém o código principal limpo e legível.
    - **Eficiência:** Se uma lógica cresce em complexidade (ex: camadas 3D), extraia-a imediatamente para um hook especializado (ex: `useProgressLayers.ts`).

## 8. Aprendizados Técnicos e Resolução de Problemas (Base de Conhecimento)

### 8.1. Falhas de Persistência no Cockpit 3D
- **Sintoma:** Alterações de Swap, Snap e Sliders "sumiam" ao dar F5.
- **Causa 1 (Estado):** Duplicidade de instâncias de Hooks no React criando fontes de dados isoladas. Solucionado unificando as chamadas do hook no componente pai.
- **Causa 2 (Protocolo):** O Backend (Orion) rejeitava comandos `PUT` com ID na URL (404). Solucionado convertendo todas as mutações para `POST` (Upsert inteligente).
- **Causa 3 (Contexto):** Falta de `company_id` no mapeamento das torres, causando rejeição silenciosa no banco. Solucionado injetando o contexto de empresa em cada ativo.
- **Causa 4 (Campos):** O backend ignorava o campo `displaySettings`. Solucionado atualizando os DTOs e o Repository para aceitar configurações visuais (groundElevation).

### 8.2. Sincronização e Race Conditions
- **Problema:** O sistema salvava valores padrão por cima dos dados carregados logo ao entrar na página.
- **Solução:** Implementação de uma trava de segurança (`isDataLoaded`) que bloqueia qualquer salvamento automático (auto-save) até que o carregamento inicial do banco seja concluído.

## 9. Regra de Ouro Inquebrável (Layout e Refatoração)

**ESTA REGRA É MANDATÓRIA PARA QUALQUER HUMANO OU AGENTE:**
- **Autorização Prévia:** É terminantemente proibido realizar qualquer modificação de layout, alteração de UI ou refatoração de código sem antes solicitar permissão explícita ao usuário.
- **Justificativa Detalhada:** Ao solicitar autorização, deve-se informar o motivo exato da mudança e passar toda a informação técnica necessária para a tomada de decisão.
- **Execução:** Somente após a aceitação formal do usuário a tarefa poderá ser iniciada.

## 10. Protocolo Rigoroso de Testes e Validação

Para garantir a estabilidade do sistema Orion (FrontEnd e BackEnd), o seguinte fluxo deve ser seguido em cada alteração:
1.  **Teste Imediato:** Toda alteração deve ser testada no momento da execução.
2.  **Plano de Correção:** Caso ocorra qualquer erro ou quebra de funcionalidade, deve-se interromper a tarefa e apresentar um plano de correção imediato.
3.  **Re-validação:** Após a correção, os testes devem ser repetidos até que o sistema esteja 100% livre de erros e operando conforme o esperado.
4.  **Organização de Testes:** Após a aprovação final, todos os arquivos de teste gerados devem ser movidos para suas respectivas pastas de testes do projeto (ex: `src/tests/` ou `e2e/`).

---
_Este documento é atualizado dinamicamente pela Gemini CLI em colaboração com a Gestão de Engenharia._
