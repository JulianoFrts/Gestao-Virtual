# Guia de Deploy na SquareCloud - Gestão Virtual

A **SquareCloud** é uma plataforma focada em simplicidade, ideal para hospedar aplicações Node.js/Web.

## 📋 Arquitetura na SquareCloud (Unificada)

O sistema roda em **1 Aplicação** + **1 Banco de Dados**:

1.  **Gestão Virtual (Unificado)**: Uma aplicação Node.js que serve Backend (API) + Frontend (Site Estático) juntos.
2.  **Banco de Dados**: PostgreSQL gerenciado pela SquareCloud.

### Como funciona internamente

```
┌─────────────────────────────────────────────────────┐
│            SquareCloud (1 App — 3072 MB)             │
│                                                      │
│  Express Gateway (Porta 80 - Pública)                │
│  ├── /api/v1/* → proxy → Next.js (porta 3001)       │
│  │              + Header X-Internal-Proxy-Key 🔒     │
│  └── /*        → dist/ (frontend estático)           │
│                                                      │
│  Next.js API (Porta 3001 - INTERNA, não exposta)     │
│  └── Apenas aceita requests com header secreto       │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Deploy Unificado (Recomendado)

### 1. Criar o Banco de Dados

1.  Acesse o [Dashboard da SquareCloud](https://squarecloud.app/dashboard).
2.  Vá em **Dedicated Databases**.
3.  Crie um novo banco **PostgreSQL**.
4.  Copie a **DATABASE_URL** fornecida.

---

### 2. Gerar o ZIP de Deploy

Execute na raiz do projeto:

```powershell
npm run deploy:zip:unified
```

Este comando:
1. Faz o **build do frontend** (Vite → `dist/`)
2. Monta a estrutura com backend (src, prisma, certificates) + frontend (dist)
3. Gera `GESTAO_VIRTUAL_UNIFIED.zip`

---

### 3. Upload na SquareCloud

1.  No Dashboard, clique em **Upload App** ou **Nova Aplicação**.
2.  Envie o arquivo `GESTAO_VIRTUAL_UNIFIED.zip`.
3.  Configure as **variáveis de ambiente** (Secrets):
    ```env
    DATABASE_URL=SuaURLdoPostgresDaSquareCloud
    NEXTAUTH_URL=https://www.gestaovirtual.com
    NEXTAUTH_SECRET=SuaSenhaSegura
    JWT_SECRET=SuaSenhaSegura
    INTERNAL_PROXY_KEY=UmaChaveUUIDv4Forte
    ```
4.  Aguarde o build e inicialização (pode levar alguns minutos no primeiro deploy).

---

### 4. Configurar Domínio

No Cloudflare, aponte `www.gestaovirtual.com` para o subdomínio da SquareCloud:
- `gestao-virtual.squareweb.app`

---

## ⚠️ Resumo das Configurações

| Item | Arquivo | Localização |
|------|---------|-------------|
| **Config Unificada** | `squarecloud.unified.app` | Raiz do projeto (vira `squarecloud.app` no ZIP) |
| **Start Unificado** | `squarecloud.unified.start.cjs` | Raiz do projeto |
| **Script de Deploy** | `deploy_zip_unified.ps1` | `scripts/` |
| **Middleware Security** | `middleware.ts` | `backend/src/` |

---

## 📦 Deploy Separado (Legado)

> **Nota:** Este modo é mantido apenas como referência. O deploy unificado acima é o recomendado.

Para deploy separado (2 apps), use:
```powershell
npm run deploy:zip:backend   # Gera ORION_BACKEND.zip
npm run deploy:zip:frontend  # Gera ORION_FRONTEND.zip
```

Boa sorte com o deploy! 🚀

