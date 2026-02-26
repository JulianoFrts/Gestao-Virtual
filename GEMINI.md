# Diretrizes Técnicas e Padrões de Engenharia - GESTÃO VIRTUAL

Este documento define os padrões fundamentais de arquitetura, segurança e qualidade de código que DEVEM ser seguidos em todas as manutenções e novas implementações do projeto.

## 1. Mandatos de Segurança e Integridade
- **Proteção de Credenciais:** Nunca logar, imprimir ou commitar segredos, chaves de API ou senhas lógicas.
- **Sanitização de Input:** Obrigatório o uso de schemas **Zod** para validação de todas as entradas de API (POST/PUT/PATCH).
- **Hardcoded Patterns:** É terminantemente proibido o uso de URLs, IPs ou segredos hardcoded. Utilize sempre o `process.env`.

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

---
*Este documento foi gerado e validado em parceria com a Gemini CLI para assegurar a excelência técnica do sistema Orion.*
