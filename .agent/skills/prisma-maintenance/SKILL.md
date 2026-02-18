---
name: prisma-maintenance
description: Diretrizes para resolução de desvios de schema Prisma, erros de mapeamento e bloqueios de regeneração.
---

# Manutenção e Sincronização Prisma

Use esta skill sempre que encontrar Erros 500 em rotas que utilizam o Prisma, desvios entre o banco de dados e o schema, ou falhas na regeneração do Prisma Client.

## 1. Identificação de Desvios (Schema Drift)

Sempre que suspeitar de desalinhamento entre o banco e o Prisma:

1.  Execute `npx prisma db pull` para gerar o arquivo `prisma/introspected.prisma`.
2.  Compare o modelo introspectado com o modelo no `prisma/schema.prisma`.
3.  **Atenção aos nomes das colunas**: O PostgreSQL pode ter colunas em `snake_case` (ex: `ip_address`) enquanto o Prisma usa `camelCase` por padrão. Use sempre `@map("nome_da_coluna")` para alinhar.

## 2. Erros 500 e Propriedades de Navegação

Se uma rota retornar Error 500 com mensagem de "Property X does not exist":

- Verifique se o nome da relação no `include` do Repositório (Prisma) condiz com o nome definido no `schema.prisma`.
- Exemplo comum: Repositório usa `activity` (nome legado), mas o Schema define `productionActivity`.
- **Regra de Ouro**: Se precisar manter compatibilidade com o Frontend, faça o mapeamento no Repositório:
  ```typescript
  const result = await prisma.table.findMany({
    include: { productionActivity: true },
  });
  return result.map((r) => ({ ...r, activity: r.productionActivity }));
  ```

## 3. Falhas no `prisma generate` (EPERM / File Lock)

Em ambientes Windows, o comando `npx prisma generate` pode falhar se o servidor (`npm run dev`) estiver rodando.

1.  **SINTOMA**: Erro `EPERM: operation not permitted, rename ... query_engine-windows.dll`.
2.  **SOLUÇÃO**: Pare o servidor de desenvolvimento, execute `taskkill /F /IM node.exe` se necessário, e então rode o comando de geração.

## 4. Geração de IDs Manuais

Se um modelo no Prisma não possui `@default(cuid())` ou `@default(uuid())`, o Prisma **exige** que o ID seja enviado no `create`.

- Use `crypto.randomUUID()` no Repositório para garantir IDs únicos antes do `upsert` ou `create`.

## 5. Auditoria (AuditLog)

Tabelas de Log frequentemente possuem misturas de padrões (`createdAt` vs `created_at`). Sempre verifique a introspecção antes de assumir o mapeamento do `AuditLog`.
