---
name: user-preferences
description: Regras de comunicação e preferências do usuário para o assistente.
---

# User Preferences

- **Idioma**: Sempre conversar com o usuário em **Português Brasileiro**.
- **Contexto**: O projeto é o "GESTÃO VIRTUAL" (antigo Team-OrioN), um sistema de gestão de obras com foco em transmissão de energia (torres, cabos, etc).
- **Aesthetics**: Seguir RIGOROSAMENTE o padrão visual definidos no `src/index.css`.
    - **Temas**: Utilizar os temas definidos (Industrial Gold, Midnight Pro, Modern Slate, Emerald Deep, Royal Purple, Crimson Steel, Sunset Horizon, Oceanic Blue, Cosmic Nebula).
    - **Visual**: Manter glassmorphism premium, animações sutis (@utility glass, @utility glass-card), sombras brilhantes (--shadow-glow) e contrastes ajustados para legibilidade.
    - **Base**: O arquivo `src/index.css` no frontend é a ÚNICA fonte de verdade para estilos globais. NÃO criar estilos ad-hoc que fujam destes padrões.
- **Lint**: Sempre verificar o lint antes de finalizar uma tarefa.
- **Componentes**: Sempre que for criar um novo componente, verificar se ele segue o padrão de componentes do projeto.
- **Validações**: Sempre que for criar uma validação, verificar se ele segue o padrão de validações do projeto.
- **Tratamento de Erros**: Sempre que for criar um tratamento de erro, verificar se ele segue o padrão de tratamento de erros do projeto.
- **Tipagem**: Sempre que for criar uma tipagem, verificar se ele segue o padrão de tipagem do projeto. 
- **DEPENDÊNCIAS**: **Evoluir Sempre**. Priorizar as versões estáveis (LTS) mais recentes. Nunca fazer downgrade. Manter `npm audit` com 0 vulnerabilidades. Evitar redundâncias e pastas temporárias.
- **LÓGICA NO BACKEND & ARQUITETURA**: Seguir padrões **DDD, SOLID e Clean Code**. A regra de ouro é: quem faz a lógica é o Backend. O Frontend deve apenas exibir dados e delegar decisões de negócio, filtros complexos e permissões para a API.
- **VERIFICAR ERROS**: Sempre verificar se contem erros antes de entregar uma tarefa. @current_problems 
- **ORGANIZAÇÃO E LIMPEZA**: Seguir RIGOROSAMENTE a regra de **Workspace Organization**. Nunca deixar arquivos de dump, logs de build, scripts temporários ou ZIPs na raiz ou espalhados. Ao finalizar uma tarefa: apagar temporários e mover logs para `archives/`.
- **LÓGICA DE IMPORTAÇÃO**: Aplicar a **Import Recognition Logic**. ELIMINAR caminhos relativos longos (`../../`). Usar obrigatoriamente ALIAS (`@/`) para garantir que o código não quebre ao mover pastas.
