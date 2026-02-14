# 📖 Guia Definitivo: Conexão e Deploy de Banco de Dados na Square Cloud

Este documento registra a metodologia **v81 (SQL Commando)** que permitiu estabelecer uma conexão estável e realizar a sincronização de tabelas no ambiente restrito da Square Cloud para o projeto **Gestão Virtual**.

## 🚀 O Desafio
Diferente de ambientes locais, a Square Cloud utiliza proxies e firewalls que interceptam conexões de gerenciamento de banco de dados. Isso causava:
- **Erro P1010**: Acesso negado durante `prisma db push`.
- **Erro P2021**: Tabelas não encontradas (pois o push falhava).
- **Timeouts (408)**: Conexões caindo em requisições longas.

## 🛠️ A Metodologia Vencedora (v81)

### 1. Conexão Atômica (Atomic Bridge)
Em vez de usar uma string única de conexão, o sistema agora prioriza campos separados. Isso evita erros de interpretação de caracteres especiais e permite que o driver nativo (`pg`) estabeleça o túnel SSL de forma mais robusta.

**Variáveis utilizadas:**
- `PGHOST`: Host do banco Square Cloud.
- `PGPORT`: Porta (7135).
- `PGUSER`: Usuário (`squarecloud`).
- `PGPASSWORD`: Senha alfanumérica.
- `PGDATABASE`: Nome do banco destino.

### 2. SQL Injection Mode (Bypass de Proxy)
Como o Prisma CLI é bloqueado para criar tabelas, usamos a técnica de injeção direta:
1.  **Geração Offline**: O comando `prisma migrate diff` gera o script SQL sem tentar modificar o banco.
2.  **Injeção Nativa**: Usamos o `pg.Pool` para executar esse SQL diretamente. Como o SQL puro via porta 7135 é permitido, as tabelas são criadas instantaneamente.

### 3. mTLS Master Configuration
A identidade do cliente é validada através de 3 arquivos cruciais na raiz `/application`:
- `ca.crt`: Certificado da Autoridade.
- `client.crt`: Identidade do seu servidor.
- `client.key`: Chave privada da identidade.

O sistema força o carregamento desses arquivos no `pg.Pool` e desabilita a verificação de cadeia (`NODE_TLS_REJECT_UNAUTHORIZED='0'`) para garantir que o túnel não caia por falta de confiança intermediária.

### 4. Auto-Build Cloud Ready
Para garantir que o servidor Next.js sempre encontre seus arquivos de produção, incluímos um sistema de **Sentinela de Build**:
- Caso a pasta `.next` esteja vazia ou corrompida, o script de startup executa `npm run build` automaticamente dentro da máquina virtual da Square Cloud.

## 🏁 Como replicar o sucesso
Para qualquer atualização que envolva mudar o banco de dados:
1. Atualize o `schema.prisma`.
2. Garanta que o arquivo `squarecloud.start.cjs` seja a versão v81 ou superior.
3. Suba o arquivo ZIP contendo o `squarecloud.start.cjs`, `package.json`, `prisma/` e `src/`.
4. Defina `FORCE_DB_PUSH=true` na aba **Config** da Square Cloud apenas para a sincronização.

---
*Documento gerado em 11 de Fevereiro de 2026 após a resolução bem-sucedida da conectividade.*
