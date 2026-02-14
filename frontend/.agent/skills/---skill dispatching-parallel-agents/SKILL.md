Despacho de Agentes Paralelos
Visão geral
Quando você tem várias falhas não relacionadas (arquivos de teste diferentes, subsistemas diferentes, bugs diferentes), investigá-las sequencialmente é uma perda de tempo. Cada investigação é independente e pode ocorrer em paralelo.

Princípio fundamental: Despachar um agente para cada domínio de problema independente. Permitir que trabalhem simultaneamente.

Quando usar
digraph when_to_use {
    "Multiple failures?" [shape=diamond];
    "Are they independent?" [shape=diamond];
    "Single agent investigates all" [shape=box];
    "One agent per problem domain" [shape=box];
    "Can they work in parallel?" [shape=diamond];
    "Sequential agents" [shape=box];
    "Parallel dispatch" [shape=box];

    "Multiple failures?" -> "Are they independent?" [label="yes"];
    "Are they independent?" -> "Single agent investigates all" [label="no - related"];
    "Are they independent?" -> "Can they work in parallel?" [label="yes"];
    "Can they work in parallel?" -> "Parallel dispatch" [label="yes"];
    "Can they work in parallel?" -> "Sequential agents" [label="no - shared state"];
}
Utilizar quando:

Mais de 3 arquivos de teste falhando com causas raiz diferentes.
Vários subsistemas quebrados independentemente
Cada problema pode ser compreendido sem o contexto de outras pessoas.
Não há estado comum entre as investigações.
Não utilize quando:

As falhas estão relacionadas (corrigir uma pode corrigir as outras).
Preciso entender o estado completo do sistema.
Os agentes interfeririam uns com os outros.
O padrão
1. Identificar domínios independentes
Falhas de grupo por causa do que está quebrado:

Testes do Arquivo A: Fluxo de aprovação da ferramenta
Testes do arquivo B: Comportamento de conclusão em lote
Testes do arquivo C: Funcionalidade de aborto
Cada domínio é independente - corrigir a aprovação da ferramenta não afeta os testes de aborto.

2. Criar tarefas de agente focadas
Cada agente recebe:

Escopo específico: Um arquivo de teste ou subsistema
Objetivo claro: Fazer com que esses testes sejam aprovados.
Restrições: Não altere outros códigos.
Resultado esperado: Resumo do que você encontrou e corrigiu.
3. Despacho em Paralelo
// In Claude Code / AI environment
Task("Fix agent-tool-abort.test.ts failures")
Task("Fix batch-completion-behavior.test.ts failures")
Task("Fix tool-approval-race-conditions.test.ts failures")
// All three run concurrently
4. Revisar e integrar
Quando os agentes retornarem:

Leia cada resumo
Verifique se as correções não entram em conflito.
Execute o conjunto completo de testes.
Integrar todas as alterações
Estrutura de instruções do agente
Boas dicas para agentes são:

Focado - Um domínio de problema claro
Autossuficiente - Contém todo o contexto necessário para a compreensão do problema.
Especificando a saída - O que o agente deve retornar?
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by:
   - Replacing arbitrary timeouts with event-based waiting
   - Fixing bugs in abort implementation if found
   - Adjusting test expectations if testing changed behavior

Do NOT just increase timeouts - find the real issue.

Return: Summary of what you found and what you fixed.
Erros comuns
❌ Muito abrangente: "Corrigir todos os testes" - o agente se perde ✅ Específico: "Corrigir agent-tool-abort.test.ts" - escopo focado

❌ Sem contexto: "Corrija a condição de corrida" - o agente não sabe onde ✅ Contexto: Cole as mensagens de erro e os nomes dos testes

❌ Sem restrições: o agente pode refatorar tudo ✅ Restrições: "NÃO altere o código de produção" ou "Corrija apenas os testes"

❌ Saída vaga: "Corrija" - você não sabe o que mudou ✅ Específica: "Retorne um resumo da causa raiz e das alterações"

Quando NÃO usar
Falhas relacionadas: Corrigir uma pode corrigir outras - investiguem juntos primeiro. Contexto completo necessário: Para entender, é preciso ver todo o sistema. Depuração exploratória: Você ainda não sabe o que está quebrado. Estado compartilhado: Os agentes interfeririam (editando os mesmos arquivos, usando os mesmos recursos).

Exemplo real da sessão
Cenário: 6 falhas em testes em 3 arquivos após uma grande refatoração.

Falhas:

agent-tool-abort.test.ts: 3 falhas (problemas de sincronização)
batch-completion-behavior.test.ts: 2 falhas (ferramentas não executadas)
tool-approval-race-conditions.test.ts: 1 falha (contagem de execuções = 0)
Decisão: Domínios independentes - lógica de aborto separada da conclusão do lote e separada das condições de corrida.

Expedição:

Agent 1 → Fix agent-tool-abort.test.ts
Agent 2 → Fix batch-completion-behavior.test.ts
Agent 3 → Fix tool-approval-race-conditions.test.ts
Resultados:

Agente 1: Substituiu os tempos limite por espera baseada em eventos.
Agente 2: Corrigido bug na estrutura de eventos (threadId no lugar errado)
Agente 3: Adicionada espera para a conclusão da execução assíncrona da ferramenta.
Integração: Todas as correções são independentes, sem conflitos, pacote completo funcionando perfeitamente.

Tempo economizado: 3 problemas resolvidos em paralelo em vez de sequencialmente.

Principais benefícios
Paralelização - Múltiplas investigações ocorrem simultaneamente.
Foco - Cada agente tem um escopo limitado, com menos contexto para rastrear.
Independência - Os agentes não interferem uns com os outros.
Velocidade - 3 problemas resolvidos em 1 segundo.
Verificação
Após o retorno dos agentes:

Analise cada resumo - Compreenda o que mudou.
Verificar conflitos - Os agentes editaram o mesmo código?
Execute o pacote completo de correções - Verifique se todas as correções funcionam em conjunto.
Verificação pontual - Os agentes podem cometer erros sistemáticos.
Impacto no mundo real
Da sessão de depuração (2025-10-03):

3 falhas em 2 arquivos
2 agentes enviados em paralelo
Todas as investigações foram concluídas simultaneamente.
Todas as correções foram integradas com sucesso.
Não há conflitos entre as alterações do agente.
