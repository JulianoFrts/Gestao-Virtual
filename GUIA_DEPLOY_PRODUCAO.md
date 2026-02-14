# Guia de Deploy em Produção - Gestão Virtual

Este guia descreve os passos para colocar o sistema **Gestão Virtual** em um ambiente de produção usando Docker.

## 📋 Pré-requisitos

1.  **Docker Desktop** (para Windows/Mac) ou **Docker Engine** (para Linux) instalado e rodando.
2.  **Git** instalado (para clonar o repositório, se necessário).

## 🚀 Passo a Passo

### 1. Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (onde está o `docker-compose.yml`). Use o modelo abaixo, alterando os valores para senhas seguras e URLs reais.

```env
# --- Banco de Dados ---
POSTGRES_USER=orion_admin
POSTGRES_PASSWORD=SuaSenhaSeguraDoBanco123
POSTGRES_DB=orion_db

# --- Backend ---
# URL de conexão com o banco (deve usar o nome do serviço 'db' e as credenciais acima)
DATABASE_URL=postgresql://orion_admin:SuaSenhaSeguraDoBanco123@db:5432/orion_db

# URLs da Aplicação
# Em produção, use o domínio real ou IP do servidor (ex: https://meusistema.com)
NEXTAUTH_URL=http://localhost:3000

# Segredos de Autenticação (Gere hashs aleatórios e seguros)
# Você pode gerar com: openssl rand -base64 32
NEXTAUTH_SECRET=GereUmaSenhaSeguraAqui1234567890
JWT_SECRET=OutraSenhaSeguraParaTokens1234567890

# Ambiente
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# --- Frontend ---
# Se necessário, ajustes específicos do Vite podem ir aqui
```

### 2. Executar o Deploy

Abra o terminal na raiz do projeto e execute:

```powershell
docker-compose up -d --build
```

Este comando irá:
1.  Baixar as imagens necessárias.
2.  Compilar e subir **4 containers**:
    *   `orion-db` (Banco de Dados)
    *   `orion-backend` (API)
    *   `orion-frontend` (Interface)
    *   `orion-worker` (Processamento em 2º plano)

> **🔒 Segurança:** Os containers `backend`, `db` e `worker` estão isolados em uma rede interna (`internal_net`). **Nenhuma porta de banco ou API é exposta diretamente** para o servidor, garantindo proteção contra acessos externos não autorizados. Apenas o Frontend (porta 5173/80) recebe tráfego.

### 3. Migrar o Banco de Dados

Após os containers subirem, você precisa criar as tabelas no banco de dados. Execute:

```powershell
docker-compose exec backend npx prisma migrate deploy
```

*(Opcional) Para popular o banco com dados iniciais (usuários admin, permissões), execute:*
```powershell
docker-compose exec backend npm run seed
```

### 4. Verificar o Status

Acesse no navegador:
- **Frontend**: `http://localhost:5173` (ou porta 80, se configurado no docker-compose)
- **Backend API**: `http://localhost:3000/api/health`

Para ver logs em tempo real:
```powershell
docker-compose logs -f
```

## 🛠️ Comandos Úteis

| Ação | Comando |
|------|---------|
| Parar o sistema | `docker-compose down` |
| Reiniciar serviços | `docker-compose restart` |
| Ver status dos containers | `docker-compose ps` |
| Acessar shell do backend | `docker-compose exec backend sh` |

## ⚠️ Notas Importantes de Segurança

1.  **HTTPS**: Para produção real na internet, é **obrigatório** usar HTTPS. Recomenda-se configurar um *Reverse Proxy* (como Nginx instalado no host, Traefik ou Caddy) na frente do Docker para gerenciar os certificados SSL.
2.  **Senhas**: Nunca comite o arquivo `.env` com senhas reais no Git.
3.  **Backups**: Configure backups periódicos do volume `postgres_data`.
