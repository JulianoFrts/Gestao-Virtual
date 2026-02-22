---
description: Como realizar migrações no Banco de Dados (Prisma) seguindo padrões Clean Code
---

Sempre que houver alteração no arquivo `prisma/schema.prisma`, siga rigorosamente este fluxo:

1.  **Ajuste o Schema**: Verifique se os novos campos usam `@map` para nomes de colunas físicos.
    // turbo
2.  **Gere a Migração**: No diretório `/backend`, execute:

    ```powershell
    npm run db:migrate -- --name sua_descricao_aqui
    ```

    _Obs: O Prisma adicionará automaticamente o timestamp ao nome da pasta. O nome deve ser descritivo e em snake_case (ex: `add_user_preferences`)._

3.  **Valide o SQL**: Abra o arquivo `migration.sql` gerado em `prisma/migrations/<timestamp>_<nome>/`. Verifique se não há exclusões acidentais.

4.  **Atualize o Cliente**: O comando acima já deve disparar o `prisma generate`, mas se houver erro de tipos, rode:

    ```powershell
    npm run prisma:generate
    ```

5.  **Recuperação de Erros**: Se encontrar problemas irreversíveis após alterar o `schema.prisma` ou se a migração falhar:
    - **Não apague a pasta migrations**.
    - **Reverta o schema.prisma**: Desfaça as alterações manuais no arquivo para que ele volte ao estado da última migração ativa.
    - **Sincronize o Banco**: No diretório `/backend`, execute:
      ```powershell
      npx prisma migrate dev
      ```
      _O Prisma detectará que o schema voltou ao estado anterior e sincronizará o banco de dados com a última migração salva no histórico._
    - Em caso de inconsistência grave (Drift), utilize `npx prisma migrate reset` para limpar o banco local e reaplicar todo o histórico de migrações do zero.

6.  **Commit**: Inclua SEMPRE no mesmo commit o arquivo `schema.prisma` e a nova pasta de migração.
