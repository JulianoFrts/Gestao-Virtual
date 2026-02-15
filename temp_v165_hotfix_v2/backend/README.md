# GESTÃO VIRTUAL Backend API

Backend robusto e escalável para o Sistema Orion, construído com Next.js 14+ App Router, TypeScript, PostgreSQL e Prisma.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas configurações

# Aplicar schema ao banco
npm run prisma:push

# Criar usuário admin
npx ts-node prisma/seed-admin.ts

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📁 Estrutura do Projeto

```
src/
├── app/                          # Next.js App Router
│   ├── api/v1/                   # API Routes versionadas
│   │   ├── auth/                 # Autenticação NextAuth
│   │   ├── companies/            # CRUD Empresas
│   │   ├── daily-reports/        # Relatórios Diários
│   │   ├── docs/                 # Documentação OpenAPI
│   │   ├── employees/            # CRUD Funcionários
│   │   ├── health/               # Health Check
│   │   ├── projects/             # CRUD Projetos
│   │   ├── sites/                # CRUD Sites/Locais
│   │   ├── teams/                # CRUD Equipes
│   │   ├── time-records/         # Registros de Ponto
│   │   └── users/                # CRUD Usuários
│   ├── docs/                     # Swagger UI
│   └── layout.tsx                # Layout principal
│
├── lib/                          # Bibliotecas e utilitários
│   ├── auth/                     # Configuração NextAuth
│   │   ├── config.ts             # Providers e callbacks
│   │   └── session.ts            # Helpers de sessão
│   ├── constants/                # Constantes do sistema
│   │   └── index.ts
│   ├── prisma/                   # Cliente Prisma
│   │   └── client.ts             # Singleton do Prisma
│   └── utils/                    # Utilitários
│       ├── api/                  # Helpers de API
│       │   ├── error.ts          # Classes de erro
│       │   └── response.ts       # Respostas padronizadas
│       ├── logger.ts             # Logger estruturado
│       ├── rate-limiter.ts       # Rate limiting
│       └── validators/           # Schemas Zod
│           └── schemas.ts
│
├── tests/                        # Testes
│   ├── setup.ts                  # Configuração de testes
│   └── unit/                     # Testes unitários
│       └── validators.test.ts
│
├── types/                        # Tipos TypeScript
│   ├── auth.ts                   # Tipos de autenticação
│   ├── database.ts               # Tipos do banco
│   └── index.ts                  # Exportações
│
└── middleware.ts                 # Middleware global (CORS, Rate Limit)

prisma/
├── schema.prisma                 # Schema do banco de dados
└── seed-admin.ts                 # Script de seed

.github/
└── workflows/
    └── ci-cd.yml                 # Pipeline CI/CD
```

## 🛠 Tecnologias

- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: NextAuth.js v5
- **Validação**: Zod
- **Documentação**: OpenAPI 3.0 / Swagger UI
- **Testes**: Jest

## 📚 API Endpoints

| Recurso       | Endpoint                | Métodos                |
| ------------- | ----------------------- | ---------------------- |
| Health        | `/api/v1/health`        | GET                    |
| Docs          | `/api/v1/docs`          | GET                    |
| Users         | `/api/v1/users`         | GET, POST, PUT, DELETE |
| Companies     | `/api/v1/companies`     | GET, POST, PUT, DELETE |
| Projects      | `/api/v1/projects`      | GET, POST, PUT, DELETE |
| Sites         | `/api/v1/sites`         | GET, POST, PUT, DELETE |
| Employees     | `/api/v1/employees`     | GET, POST, PUT, DELETE |
| Teams         | `/api/v1/teams`         | GET, POST, PUT, DELETE |
| Time Records  | `/api/v1/time-records`  | GET, POST              |
| Daily Reports | `/api/v1/daily-reports` | GET, POST              |

## 🔗 URLs Úteis

- **API**: http://localhost:3000/api/v1
- **Swagger UI**: http://localhost:3000/docs
- **Prisma Studio**: http://localhost:5555
- **Health Check**: /api/v1/health

## 📦 Scripts

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Iniciar produção
npm run lint         # Linter
npm test             # Executar testes

npm run prisma:generate  # Gerar cliente Prisma
npm run prisma:push      # Aplicar schema ao banco
npm run prisma:studio    # Abrir Prisma Studio
npm run prisma:migrate   # Criar migration
```

## 🔐 Autenticação

A API usa JWT via NextAuth.js. Para acessar endpoints protegidos:

1. Faça login para obter o token de sessão
2. Inclua o token nos headers das requisições

**Roles disponíveis**: `USER`, `ADMIN`, `MODERATOR`, `MANAGER`, `SUPERVISOR`, `TECHNICIAN`, `OPERATOR`

## 📝 Licença

MIT
