# Guia de Deploy na SquareCloud - Gestão Virtual

A **SquareCloud** é uma plataforma focada em simplicidade, ideal para hospedar bots e aplicações Node.js/Web. Diferente do Docker (onde tudo roda junto), aqui nós separamos cada serviço.

## 📋 Arquitetura na SquareCloud

Seu sistema será dividido em **3 Aplicações** e **1 Banco de Dados**:

1.  **Backend (API)**: Uma aplicação Node.js.
2.  **Frontend (Site)**: Uma aplicação Web Estática.
3.  **Worker (Opcional)**: Uma aplicação Node.js para tarefas pesadas.
4.  **Banco de Dados**: PostgreSQL gerenciado pela SquareCloud.

---

## 🚀 Passo a Passo

### 1. Criar o Banco de Dados

1.  Acesse o [Dashboard da SquareCloud](https://squarecloud.app/dashboard).
2.  Vá em **Dedicated Databases**.
3.  Crie um novo banco **PostgreSQL**.
4.  Copie a **DATABASE_URL** fornecida. Você vai precisar dela.

---

### 2. Deploy do Backend (API)

Este deploy envia sua API para a nuvem.

1.  Navegue até a pasta `backend/`.
2.  Edite o arquivo `.env` localmente (ou configure no dashboard depois) com as variáveis de produção:
    ```env
    DATABASE_URL=SuaURLdoPostgresDaSquareCloud
    NEXTAUTH_URL=https://seu-frontend.squareweb.app (URL que você terá após subir o front)
    NEXTAUTH_SECRET=SuaSenhaSegura
    JWT_SECRET=SuaSenhaSegura
    ```
    > **Dica:** A SquareCloud permite definir variáveis de ambiente (Secrets) diretamente no painel da aplicação após o upload. Isso é mais seguro.

3.  **Compactar**: Selecione **TODOS** os arquivos dentro da pasta `backend/` e crie um arquivo ZIP (ex: `backend.zip`).
    *   ⚠️ **Importante:** Não inclua a pasta `node_modules` ou `.next` (o build será feito lá ou você sobe o build pronto).
    *   *Recomendação:* Para next.js na SquareCloud, o ideal é subir os arquivos fonte e deixar ele instalar (`npm install`) e rodar (`npm start`). Certifique-se de que o `package.json` tem os scripts de build se necessário, ou envie a pasta `.next` já buildada se preferir (mais rápido, mas arquivo maior).
    *   O arquivo `squarecloud.app` já está configurado para `npm run start`.

4.  **Upload**:
    *   No Dashboard, clique em **Upload App**.
    *   Envie o arquivo `backend.zip`.
    *   Aguarde o build e inicialização.
    *   Copie a URL da aplicação (ex: `https://orion-backend.squareweb.app`).

---

### 3. Deploy do Frontend (Site)

1.  Navegue até a pasta `frontend/`.
2.  **Build**: Execute o comando de build localmente para gerar a pasta `dist`:
    ```powershell
    npm run build
    ```
3.  **Compactar**: Entre na pasta `dist/` gerada. Selecione tudo e crie um ZIP.
    *   **OU**: Compacte a raiz do `frontend/` (sem node_modules) e configure o `MAIN` para `dist/index.html` se quiser buildar lá (mas sites estáticos geralmente sobem prontos).
    *   *Nossa configuração atual (`squarecloud.app`):* Espera que você suba a raiz do `frontend`. A SquareCloud detectará o site estático.
    *   **Melhor prática para Static na Square:** Suba o conteúdo da pasta `dist` com o arquivo `squarecloud.app` dentro dela.
    
    **Passo Corrigido:**
    1.  Rode `npm run build` no `frontend`.
    2.  Copie o arquivo `squarecloud.app` para dentro da pasta `dist`.
    3.  Compacte o conteúdo da pasta `dist`.
    4.  Faça o upload desse ZIP.

4.  **Upload**:
    *   Envie o ZIP no Dashboard.
    *   Tipo: **Website**.

---

### 4. Conectar Tudo

Após subir o Backend e o Frontend:

1.  Volte nas configurações do **Backend** na SquareCloud.
2.  Garanta que a variável `NEXTAUTH_URL` aponta para a URL do seu **Frontend**.
3.  Vá no código do seu **Frontend** (localmente), edite a variável que aponta para a API (ex: `VITE_API_URL`) para apontar para a URL do **Backend** da SquareCloud.
4.  Re-builde o Frontend e suba novamente se mudou a variável.

---

### 5. Deploy do Worker (Opcional)

Se precisar do processamento em segundo plano:

1.  Entre na pasta `backend/`.
2.  Crie um ZIP contendo:
    *   `package.json`
    *   `worker.ts`
    *   `squarecloud.worker.app` (renomeie para `squarecloud.app`)
    *   Pasta `src/` (se houver dependências)
3.  Suba como uma nova aplicação.

## ⚠️ Resumo das Configurações Criadas

| Aplicação | Arquivo de Config | Onde está |
|-----------|-------------------|-----------|
| **Backend** | `squarecloud.app` | `backend/` |
| **Frontend** | `squarecloud.app` | `frontend/` |
| **Worker** | `squarecloud.worker.app` | `backend/` |

Boa sorte com o deploy! 🚀
